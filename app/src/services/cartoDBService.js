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

const ISO = `with s as (SELECT st_makevalid(st_simplify(the_geom, 0.0001)) as the_geom
            FROM gadm2_countries_simple
            WHERE iso = UPPER('{{iso}}'))

            SELECT round(sum(f.areameters)/10000) AS value
            FROM prodes_wgs84 f inner join s
            on st_intersects(f.the_geom, s.the_geom)
              AND to_date(f.ano, 'YYYY') >= '{{begin}}'::date
              AND to_date(f.ano, 'YYYY') < '{{end}}'::date
            `;

const ID1 = ` with s as (SELECT st_makevalid(st_simplify(the_geom, 0.0001)) as the_geom
            FROM gadm2_provinces_simple
            WHERE iso = UPPER('{{iso}}') AND id_1 = {{id1}})

            SELECT round(sum(f.areameters)/10000) AS value
            FROM prodes_wgs84 f inner join s
            on st_intersects(f.the_geom, s.the_geom)
             AND to_date(f.ano, 'YYYY') >= '{{begin}}'::date
             AND to_date(f.ano, 'YYYY') < '{{end}}'::date
            `;

const USE = `SELECT round(sum(f.areameters)/10000) AS value
                FROM {{useTable}} u inner join prodes_wgs84 f
                on ST_Intersects(f.the_geom, u.the_geom)
                AND to_date(f.ano, 'YYYY') >= '{{begin}}'::date
                AND to_date(f.ano, 'YYYY') < '{{end}}'::date
                WHERE u.cartodb_id = {{pid}}
                `;

const WDPA = `with p as (SELECT
           CASE WHEN marine::numeric = 2
                   THEN null
                WHEN ST_NPoints(the_geom)<=18000
                   THEN the_geom
                WHEN ST_NPoints(the_geom) BETWEEN 18000 AND 50000 THEN ST_RemoveRepeatedPoints(the_geom, 0.001)
                ELSE ST_RemoveRepeatedPoints(the_geom, 0.005)
                END as the_geom, gis_area*100 as area_ha FROM wdpa_protected_areas where wdpaid={{wdpaid}})
            SELECT round(sum(f.areameters)/10000) AS value
            FROM prodes_wgs84 f inner join p
            on ST_Intersects(f.the_geom, p.the_geom)
            AND to_date(f.ano, 'YYYY') >= '{{begin}}'::date
            AND to_date(f.ano, 'YYYY') < '{{end}}'::date
            `;

const LATEST = `SELECT DISTINCT ano
        FROM prodes_wgs84
        WHERE ano IS NOT NULL
        ORDER BY ano DESC
        LIMIT {{limit}}`;

const executeThunk = (client, sql, params) => (callback) => {
    logger.debug(Mustache.render(sql, params));
    client.execute(sql, params).done((data) => {
        callback(null, data);
    }).error((err) => {
        callback(err, null);
    });
};


const getToday = () => {
    const today = new Date();
    return `${today.getFullYear().toString()}-${(today.getMonth() + 1).toString()}-${today.getDate().toString()}`;
};

const getYesterday = () => {
    const yesterday = new Date(Date.now() - (24 * 60 * 60 * 1000));
    return `${yesterday.getFullYear().toString()}-${(yesterday.getMonth() + 1).toString()}-${yesterday.getDate().toString()}`;
};


const defaultDate = () => {
    const to = getToday();
    const from = getYesterday();
    return `${from},${to}`;
};

const getPeriodText = (period) => {
    const periods = period.split(',');
    const days = (new Date(periods[1]) - new Date(periods[0])) / (24 * 60 * 60 * 1000);

    switch (days) {

        case 1:
            return 'Past 24 hours';
        case 2:
            return 'Past 48 hours';
        case 3:
            return 'Past 72 hours';
        default:
            return 'Past week';

    }
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
            const formats = ['csv', 'geojson', 'kml', 'shp', 'svg'];
            const download = {};
            let queryFinal = Mustache.render(query, params);
            queryFinal = queryFinal.replace('SELECT round(sum(f.areameters)/10000) AS value', 'SELECT f.*');
            queryFinal = encodeURIComponent(queryFinal);
            for (let i = 0, { length } = formats; i < length; i++) {
                download[formats[i]] = `${this.apiUrl}?q=${queryFinal}&format=${formats[i]}`;
            }
            return download;
        } catch (err) {
            logger.error(err);
        }
    }

    * getNational(iso, alertQuery, period = defaultDate()) {
        logger.debug('Obtaining national of iso %s', iso);
        const periods = period.split(',');
        const params = {
            iso,
            begin: periods[0],
            end: periods[1]
        };
        const geostore = yield GeostoreService.getGeostoreByIso(iso);
        const data = yield executeThunk(this.client, ISO, params);
        if (geostore) {
            if (data.rows && data.rows.length > 0) {
                const result = data.rows[0];
                result.area_ha = geostore.areaHa;
                result.period = getPeriodText(period);
                result.downloadUrls = this.getDownloadUrls(ISO, params);
                return result;
            }
            return {
                area_ha: geostore.areaHa
            };

        }
        return null;
    }

    * getSubnational(iso, id1, alertQuery, period = defaultDate()) {
        logger.debug('Obtaining subnational of iso %s and id1', iso, id1);
        const periods = period.split(',');
        const params = {
            iso,
            id1,
            begin: periods[0],
            end: periods[1]
        };
        const geostore = yield GeostoreService.getGeostoreByIsoAndId(iso, id1);
        const data = yield executeThunk(this.client, ID1, params);
        if (geostore) {
            if (data.rows && data.rows.length > 0) {
                const result = data.rows[0];
                result.area_ha = geostore.areaHa;
                result.period = getPeriodText(period);
                result.downloadUrls = this.getDownloadUrls(ID1, params);
                return result;
            }
            return {
                area_ha: geostore.areaHa
            };

        }
        return null;
    }

    * getUse(useName, useTable, id, alertQuery, period = defaultDate()) {
        logger.debug('Obtaining use with id %s', id);
        const periods = period.split(',');
        const params = {
            useTable,
            pid: id,
            begin: periods[0],
            end: periods[1]
        };
        const geostore = yield GeostoreService.getGeostoreByUse(useName, id);
        const data = yield executeThunk(this.client, USE, params);
        if (geostore) {
            if (data.rows && data.rows.length > 0) {
                const result = data.rows[0];
                result.area_ha = geostore.areaHa;
                result.period = getPeriodText(period);
                result.downloadUrls = this.getDownloadUrls(USE, params);
                return result;
            }
            return {
                area_ha: geostore.areaHa
            };

        }
        return null;
    }

    * getWdpa(wdpaid, alertQuery, period = defaultDate()) {
        logger.debug('Obtaining wpda of id %s', wdpaid);
        const periods = period.split(',');
        const params = {
            wdpaid,
            begin: periods[0],
            end: periods[1]
        };
        const geostore = yield GeostoreService.getGeostoreByWdpa(wdpaid);
        const data = yield executeThunk(this.client, WDPA, params);
        if (geostore) {
            if (data.rows && data.rows.length > 0) {
                const result = data.rows[0];
                result.area_ha = geostore.areaHa;
                result.period = getPeriodText(period);
                result.downloadUrls = this.getDownloadUrls(WDPA, params);
                return result;
            }
            return {
                area_ha: geostore.areaHa
            };

        }
        return null;
    }


    * getWorld(hashGeoStore, alertQuery, period = defaultDate()) {
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

    * getWorldWithGeojson(geojson, alertQuery, period = defaultDate()) {
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

    * latest(limit = 3) {
        logger.debug('Obtaining latest with limit %s', limit);
        const params = {
            limit
        };
        const data = yield executeThunk(this.client, LATEST, params);

        if (data.rows) {
            const result = data.rows;
            return result;
        }
        return null;
    }

}

module.exports = new CartoDBService();
