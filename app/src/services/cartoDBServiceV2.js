/* eslint-disable no-mixed-operators */
const logger = require('logger');
const config = require('config');
const CartoDB = require('cartodb');
const Mustache = require('mustache');
const NotFound = require('errors/notFound');
const GeostoreService = require('services/geostoreService');

const WORLD = `WITH tmp_group AS (SELECT *
                          FROM prodes_wgs84 f
                          WHERE to_date(f.ano, 'YYYY') >= '{{begin}}'::date
                          AND to_date(f.ano, 'YYYY') < '{{end}}'::date
                          AND ST_Intersects(
                                  ST_SetSRID(
                                    ST_GeomFromGeoJSON('{{{geojson}}}'), 4326), f.the_geom))
                          SELECT ROUND(SUM(ST_AREA(ST_Intersection(ST_SetSRID(
                                    ST_GeomFromGeoJSON('{{{geojson}}}'), 4326), tmp_group.the_geom)::geography))*0.0001) as value
                                    FROM tmp_group`;

const AREA = `select ST_Area(ST_SetSRID(ST_GeomFromGeoJSON('{{{geojson}}}'), 4326), TRUE)/10000 as area_ha`;

const GIDAREA = `select area_ha FROM {{table}} WHERE gid_{{level}} = '{{gid}}'`;

const ISO = `with s as (SELECT st_makevalid(st_simplify(the_geom, {{simplify}})) as the_geom, area_ha
            FROM gadm36_countries
            WHERE gid_0 = UPPER('{{iso}}')),

            r AS (SELECT round(sum(f.areameters)/10000) AS value, s.area_ha
            FROM prodes_wgs84 f inner join s
            on st_intersects(f.the_geom, s.the_geom)
              AND to_date(f.ano, 'YYYY') >= '{{begin}}'::date
              AND to_date(f.ano, 'YYYY') < '{{end}}'::date
              GROUP BY s.area_ha)
              SELECT * FROM r
            `;

const ID1 = ` with s as (SELECT st_makevalid(st_simplify(the_geom, {{simplify}})) as the_geom, area_ha
            FROM gadm36_adm1
            WHERE gid_0 = UPPER('{{iso}}') AND gid_1 = '{{id1}}')

            SELECT round(sum(f.areameters)/10000) AS value, s.area_ha
            FROM prodes_wgs84 f inner join s
            on st_intersects(f.the_geom, s.the_geom)
             AND to_date(f.ano, 'YYYY') >= '{{begin}}'::date
             AND to_date(f.ano, 'YYYY') < '{{end}}'::date
             GROUP BY s.area_ha
            `;

const ID2 = ` with s as (SELECT st_makevalid(st_simplify(the_geom, {{simplify}})) as the_geom, area_ha
            FROM gadm36_adm2
            WHERE gid_0 = UPPER('{{iso}}') AND gid_1 = '{{id1}}' AND gid_2 = '{{id2}}')

            SELECT round(sum(f.areameters)/10000) AS value, s.area_ha
            FROM prodes_wgs84 f inner join s
            on st_intersects(f.the_geom, s.the_geom)
             AND to_date(f.ano, 'YYYY') >= '{{begin}}'::date
             AND to_date(f.ano, 'YYYY') < '{{end}}'::date
             GROUP BY s.area_ha
            `;

const USEAREA = `select area_ha FROM {{useTable}} WHERE cartodb_id = {{pid}}`;

const USE = `SELECT round(sum(f.areameters)/10000) AS value, u.area_ha
                FROM {{useTable}} u inner join prodes_wgs84 f
                on ST_Intersects(f.the_geom, u.the_geom)
                AND to_date(f.ano, 'YYYY') >= '{{begin}}'::date
                AND to_date(f.ano, 'YYYY') < '{{end}}'::date
                WHERE u.cartodb_id = {{pid}}
                GROUP BY u.area_ha
                `;

const WDPAAREA = `select gis_area*100 as area_ha FROM wdpa_protected_areas WHERE wdpaid = {{wdpaid}}`;

const WDPA = `with p as (SELECT
           CASE WHEN marine::numeric = 2
                   THEN null
                WHEN ST_NPoints(the_geom)<=18000
                   THEN the_geom
                WHEN ST_NPoints(the_geom) BETWEEN 18000 AND 50000 THEN ST_RemoveRepeatedPoints(the_geom, 0.001)
                ELSE ST_RemoveRepeatedPoints(the_geom, 0.005)
                END as the_geom, gis_area*100 as area_ha FROM wdpa_protected_areas where wdpaid={{wdpaid}})
            SELECT round(sum(f.areameters)/10000) AS value, p.area_ha
            FROM prodes_wgs84 f inner join p
            on ST_Intersects(f.the_geom, p.the_geom)
            AND to_date(f.ano, 'YYYY') >= '{{begin}}'::date
            AND to_date(f.ano, 'YYYY') < '{{end}}'::date
            GROUP BY p.area_ha
            `;

const LATEST = `with a AS (SELECT DISTINCT ano
FROM prodes_wgs84
WHERE ano IS NOT NULL) SELECT MAX(ano) AS latest FROM a`;

const executeThunk = (client, sql, params) => (callback) => {
    logger.debug(Mustache.render(sql, params));
    client.execute(sql, params).done((data) => {
        callback(null, data);
    }).error((err) => {
        callback(err, null);
    });
};

const routeToGid = (adm0, adm1, adm2) => ({
    adm0,
    adm1: adm1 ? `${adm0}.${adm1}_1` : null,
    adm2: adm2 ? `${adm0}.${adm1}.${adm2}_1` : null
});

const getToday = () => {
    const today = new Date();
    return `${today.getFullYear().toString()}-${(today.getMonth() + 1).toString()}-${today.getDate().toString()}`;
};

const defaultDate = () => {
    const to = getToday();
    const from = '2000-01-01';
    return `${from},${to}`;
};

const getSimplify = (iso) => {
    let thresh = 0.005;
    if (iso) {
        const bigCountries = ['USA', 'RUS', 'CAN', 'CHN', 'BRA', 'IDN'];
        thresh = bigCountries.includes(iso) ? 0.05 : 0.005;
    }
    return thresh;
};

class CartoDBService {

    constructor() {
        this.client = new CartoDB.SQL({
            user: config.get('cartoDB.user')
        });
        this.apiUrl = config.get('cartoDB.apiUrl');
    }

    // eslint-disable-next-line consistent-return
    getDownloadUrls(query, params) {
        try {
            const formats = ['csv', 'json', 'kml', 'shp', 'svg'];
            const download = {};
            let queryFinal = Mustache.render(query, params);
            queryFinal = encodeURIComponent(queryFinal);
            for (let i = 0, { length } = formats; i < length; i++) {
                download[formats[i]] = `${this.apiUrl}?q=${queryFinal}&format=${formats[i]}`;
            }
            return download;
        } catch (err) {
            logger.error(err);
        }
    }

    * getAdm0(iso, period = defaultDate()) {
        logger.debug('Obtaining national of iso %s', iso);
        const gid = routeToGid(iso);
        const simplify = getSimplify(iso);
        const periods = period.split(',');
        const params = {
            iso: gid.adm0,
            begin: periods[0],
            end: periods[1],
            simplify
        };
        const data = yield executeThunk(this.client, ISO, params);
        const result = data.rows && data.rows[0] || {};
        result.downloadUrls = this.getDownloadUrls(ISO, params);
        result.id = params.iso;
        result.period = period;
        if (data && data.rows && data.rows.length) {
            result.value = result.value || 0;
            return result;
        }
        const area = yield executeThunk(this.client, GIDAREA, {
            table: 'gadm36_countries',
            level: '0',
            gid: params.iso
        });
        if (area && area.rows && area.rows.length) {
            const areaHa = area.rows && area.rows[0] || null;
            result.area_ha = areaHa.area_ha;
            result.value = null;
            return result;
        }
        return null;
    }

    * getAdm1(iso, id1, period = defaultDate()) {
        logger.debug('Obtaining subnational of iso %s and id1', iso, id1);
        const gid = routeToGid(iso, id1);
        const simplify = getSimplify(iso) / 10;
        const periods = period.split(',');
        const params = {
            iso: gid.adm0,
            id1: gid.adm1,
            begin: periods[0],
            end: periods[1],
            simplify
        };
        const data = yield executeThunk(this.client, ID1, params);
        const result = data.rows && data.rows[0] || {};
        result.downloadUrls = this.getDownloadUrls(ID1, params);
        result.id = params.iso;
        result.period = period;
        if (data && data.rows && data.rows.length) {
            result.value = result.value || 0;
            return result;
        }
        const area = yield executeThunk(this.client, GIDAREA, { table: 'gadm36_adm1', level: '1', gid: params.id1 });
        if (area && area.rows && area.rows.length) {
            const areaHa = area.rows && area.rows[0] || null;
            result.area_ha = areaHa.area_ha;
            result.value = null;
            return result;
        }
        return null;
    }

    * getAdm2(iso, id1, id2, period = defaultDate()) {
        logger.debug('Obtaining subnational of iso %s and id1', iso, id1);
        const gid = routeToGid(iso, id1, id2);
        const simplify = getSimplify(iso) / 100;
        const periods = period.split(',');
        const params = {
            iso: gid.adm0,
            id1: gid.adm1,
            id2: gid.adm2,
            begin: periods[0],
            end: periods[1],
            simplify
        };
        const data = yield executeThunk(this.client, ID2, params);
        const result = data.rows && data.rows[0] || {};
        result.downloadUrls = this.getDownloadUrls(ID1, params);
        result.id = params.iso;
        result.period = period;
        if (data && data.rows && data.rows.length) {
            result.value = result.value || 0;
            return result;
        }
        const area = yield executeThunk(this.client, GIDAREA, { table: 'gadm36_adm2', level: '2', gid: params.id2 });
        if (area && area.rows && area.rows.length) {
            const areaHa = area.rows && area.rows[0] || null;
            result.area_ha = areaHa.area_ha;
            result.value = null;
            return result;
        }
        return null;
    }

    * getUse(useTable, id, period = defaultDate()) {
        logger.debug('Obtaining use with id %s', id);
        const periods = period.split(',');
        const params = {
            useTable,
            pid: id,
            begin: periods[0],
            end: periods[1]
        };
        const data = yield executeThunk(this.client, USE, params);

        if (data.rows && data.rows.length > 0) {
            const result = data.rows[0];
            result.id = id;
            result.period = period;
            result.downloadUrls = this.getDownloadUrls(USE, params);
            return result;
        }
        const areas = yield executeThunk(this.client, USEAREA, params);
        if (areas.rows && areas.rows.length > 0) {
            const result = areas.rows[0];
            result.id = id;
            result.value = 0;
            return result;
        }
        const geostore = yield GeostoreService.getGeostoreByUse(useTable, id);
        if (geostore) {
            return {
                id,
                value: 0,
                area_ha: geostore.area_ha
            };
        }
        return null;
    }

    * getWdpa(wdpaid, period = defaultDate()) {
        logger.debug('Obtaining wpda of id %s', wdpaid);
        const periods = period.split(',');
        const params = {
            wdpaid,
            begin: periods[0],
            end: periods[1]
        };
        const data = yield executeThunk(this.client, WDPA, params);
        if (data.rows && data.rows.length > 0) {
            const result = data.rows[0];
            result.id = wdpaid;
            result.period = period;
            result.downloadUrls = this.getDownloadUrls(WDPA, params);
            return result;
        }
        const areas = yield executeThunk(this.client, WDPAAREA, params);
        if (areas.rows && areas.rows.length > 0) {
            const result = areas.rows[0];
            result.id = wdpaid;
            result.value = 0;
            return result;
        }
        const geostore = yield GeostoreService.getGeostoreByWdpa(wdpaid);
        if (geostore) {
            return {
                id: wdpaid,
                value: 0,
                area_ha: geostore.area_ha
            };
        }
        return null;
    }


    * getWorld(hashGeoStore, period = defaultDate()) {
        logger.debug('Obtaining world with hashGeoStore %s', hashGeoStore);

        const geostore = yield GeostoreService.getGeostoreByHash(hashGeoStore);
        if (geostore && geostore.geojson) {
            logger.debug('Executing query in cartodb with geojson', geostore.geojson);
            const periods = period.split(',');
            const params = {
                geojson: JSON.stringify(geostore.geojson.features[0].geometry),
                begin: periods[0],
                end: periods[1]
            };
            const data = yield executeThunk(this.client, WORLD, params);
            if (data.rows) {
                const result = data.rows[0];
                result.area_ha = geostore.areaHa;

                result.downloadUrls = this.getDownloadUrls(WORLD, params);
                return result;
            }
            return null;
        }
        throw new NotFound('Geostore not found');
    }

    * getWorldWithGeojson(geojson, period = defaultDate()) {
        logger.debug('Executing query in cartodb with geojson', geojson);
        const periods = period.split(',');
        const params = {
            geojson: JSON.stringify(geojson.features[0].geometry),
            begin: periods[0],
            end: periods[1]
        };
        const data = yield executeThunk(this.client, WORLD, params);
        logger.debug('data', data);
        const dataArea = yield executeThunk(this.client, AREA, params);
        const result = {
            area_ha: dataArea.rows[0].area_ha
        };
        if (data.rows) {
            result.value = data.rows[0].value || 0;

        }
        result.area_ha = dataArea.rows[0].area_ha;
        result.downloadUrls = this.getDownloadUrls(WORLD, params);
        return result;
    }

    * latest() {
        logger.debug('Obtaining latest date');
        const data = yield executeThunk(this.client, LATEST);
        if (data && data.rows && data.rows.length) {
            const result = data.rows;
            return result;
        }
        return null;
    }

}

module.exports = new CartoDBService();
