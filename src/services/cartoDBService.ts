import config from 'config';
import logger from 'logger';
import Mustache from 'mustache';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import CartoDB from 'cartodb';
import NotFound from "errors/notFound";
import GeostoreService from "services/geostoreService";


const WORLD: string = `WITH tmp_group AS (SELECT *
                          FROM prodes_wgs84 f
                          WHERE to_date(f.ano, 'YYYY') >= '{{begin}}'::date
                          AND to_date(f.ano, 'YYYY') < '{{end}}'::date
                          AND ST_Intersects(
                                  ST_SetSRID(
                                    ST_GeomFromGeoJSON('{{{geojson}}}'), 4326), f.the_geom))
                          SELECT ROUND(SUM(ST_AREA(ST_Intersection(ST_SetSRID(
                                    ST_GeomFromGeoJSON('{{{geojson}}}'), 4326), tmp_group.the_geom)::geography))*0.0001) as value
                                    FROM tmp_group`;

const AREA: string = `select ST_Area(ST_SetSRID(ST_GeomFromGeoJSON('{{{geojson}}}'), 4326), TRUE)/10000 as area_ha`;

const ISO: string = `with s as (SELECT st_makevalid(st_simplify(the_geom, 0.0001)) as the_geom
            FROM gadm2_countries_simple
            WHERE iso = UPPER('{{iso}}'))

            SELECT round(sum(f.areameters)/10000) AS value
            FROM prodes_wgs84 f inner join s
            on st_intersects(f.the_geom, s.the_geom)
              AND to_date(f.ano, 'YYYY') >= '{{begin}}'::date
              AND to_date(f.ano, 'YYYY') < '{{end}}'::date
            `;

const ID1: string = ` with s as (SELECT st_makevalid(st_simplify(the_geom, 0.0001)) as the_geom
            FROM gadm2_provinces_simple
            WHERE iso = UPPER('{{iso}}') AND id_1 = {{id1}})

            SELECT round(sum(f.areameters)/10000) AS value
            FROM prodes_wgs84 f inner join s
            on st_intersects(f.the_geom, s.the_geom)
             AND to_date(f.ano, 'YYYY') >= '{{begin}}'::date
             AND to_date(f.ano, 'YYYY') < '{{end}}'::date
            `;

const USE: string = `SELECT round(sum(f.areameters)/10000) AS value
                FROM {{useTable}} u inner join prodes_wgs84 f
                on ST_Intersects(f.the_geom, u.the_geom)
                AND to_date(f.ano, 'YYYY') >= '{{begin}}'::date
                AND to_date(f.ano, 'YYYY') < '{{end}}'::date
                WHERE u.cartodb_id = {{pid}}
                `;

const WDPA: string = `with p as (SELECT
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

const LATEST: string = `SELECT DISTINCT ano
        FROM prodes_wgs84
        WHERE ano IS NOT NULL
        ORDER BY ano DESC
        LIMIT {{limit}}`;

const executeThunk = async (client: CartoDB.SQL, sql: string, params: any): Promise<Record<string, any>> => (new Promise((resolve: (value: (PromiseLike<unknown> | unknown)) => void, reject: (reason?: any) => void) => {
    logger.debug(Mustache.render(sql, params));
    client.execute(sql, params).done((data: Record<string, any>) => {
        resolve(data);
    }).error((error: Error) => {
        reject(error);
    });
}));

const getToday = (): string => {
    const today: Date = new Date();
    return `${today.getFullYear().toString()}-${(today.getMonth() + 1).toString()}-${today.getDate().toString()}`;
};

const getYesterday = (): string => {
    const yesterday: Date = new Date(Date.now() - (24 * 60 * 60 * 1000));
    return `${yesterday.getFullYear().toString()}-${(yesterday.getMonth() + 1).toString()}-${yesterday.getDate().toString()}`;
};


const defaultDate = (): string => {
    const to: string = getToday();
    const from: string = getYesterday();
    return `${from},${to}`;
};

const getPeriodText = (period: string): string => {
    const periods: string[] = period.split(',');
    const days: number = (new Date(periods[1]).getTime() - new Date(periods[0]).getTime()) / (24 * 60 * 60 * 1000);

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

    client: CartoDB.SQL;
    apiUrl: string;

    constructor() {
        this.client = new CartoDB.SQL({
            user: config.get('cartoDB.user')
        });
        this.apiUrl = config.get('cartoDB.apiUrl');
    }


    getDownloadUrls(query: string, params: Record<string, any>): Record<string, any> | void {
        try {
            const formats: string[] = ['csv', 'geojson', 'kml', 'shp', 'svg'];
            const download: Record<string, any> = {};
            let queryFinal: string = Mustache.render(query, params);
            queryFinal = queryFinal.replace('SELECT round(sum(f.areameters)/10000) AS value', 'SELECT f.*');
            queryFinal = encodeURIComponent(queryFinal);
            for (let i: number = 0, { length } = formats; i < length; i++) {
                download[formats[i]] = `${this.apiUrl}?q=${queryFinal}&format=${formats[i]}`;
            }
            return download;
        } catch (err) {
            logger.error(err);
        }
    }

    async getNational(iso: string, period: string = defaultDate(), apiKey: string): Promise<Record<string, any> | void> {
        logger.debug('Obtaining national of iso %s', iso);
        const periods: string[] = period.split(',');
        const params: Record<string, any> = {
            iso,
            begin: periods[0],
            end: periods[1]
        };
        const geostore: Record<string, any> = await GeostoreService.getGeostoreByIso(iso, apiKey);
        const data: Record<string, any> = await executeThunk(this.client, ISO, params);
        if (geostore) {
            if (data.rows && data.rows.length > 0) {
                const result: Record<string, any> = data.rows[0];
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

    async getSubnational(iso: string, id1: string, period: string = defaultDate(), apiKey: string): Promise<Record<string, any> | void> {
        logger.debug('Obtaining subnational of iso %s and id1', iso, id1);
        const periods: string[] = period.split(',');
        const params: Record<string, any> = {
            iso,
            id1,
            begin: periods[0],
            end: periods[1]
        };
        const geostore: Record<string, any> = await GeostoreService.getGeostoreByIsoAndId(iso, id1, apiKey);
        const data: Record<string, any> = await executeThunk(this.client, ID1, params);
        if (geostore) {
            if (data.rows && data.rows.length > 0) {
                const result: Record<string, any> = data.rows[0];
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

    async getUse(useName: string, useTable: string, id: string, period: string = defaultDate(), apiKey: string): Promise<Record<string, any> | void> {
        logger.debug('Obtaining use with id %s', id);
        const periods: string[] = period.split(',');
        const params: Record<string, any> = {
            useTable,
            pid: id,
            begin: periods[0],
            end: periods[1]
        };
        const geostore: Record<string, any> = await GeostoreService.getGeostoreByUse(useName, id, apiKey);
        const data: Record<string, any> = await executeThunk(this.client, USE, params);
        if (geostore) {
            if (data.rows && data.rows.length > 0) {
                const result: Record<string, any> = data.rows[0];
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

    async getWdpa(wdpaid: string, period: string = defaultDate(), apiKey: string): Promise<Record<string, any> | void> {
        logger.debug('Obtaining wpda of id %s', wdpaid);
        const periods: string[] = period.split(',');
        const params: Record<string, any> = {
            wdpaid,
            begin: periods[0],
            end: periods[1]
        };
        const geostore: Record<string, any> = await GeostoreService.getGeostoreByWdpa(wdpaid, apiKey);
        const data: Record<string, any> = await executeThunk(this.client, WDPA, params);
        if (geostore) {
            if (data.rows && data.rows.length > 0) {
                const result: Record<string, any> = data.rows[0];
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


    async getWorld(hashGeoStore: string, period: string = defaultDate(), apiKey: string): Promise<Record<string, any> | void> {
        logger.debug('Obtaining world with hashGeoStore %s', hashGeoStore);

        const geostore: Record<string, any> = await GeostoreService.getGeostoreByHash(hashGeoStore, apiKey);
        if (geostore && geostore.geojson) {
            logger.debug('Executing query in cartodb with geojson', geostore.geojson);
            const periods: string[] = period.split(',');
            const params: Record<string, any> = {
                geojson: JSON.stringify(geostore.geojson.features[0].geometry),
                begin: periods[0],
                end: periods[1]
            };
            const data: Record<string, any> = await executeThunk(this.client, WORLD, params);
            if (data.rows) {
                const result: Record<string, any> = data.rows[0];
                result.area_ha = geostore.areaHa;

                result.downloadUrls = this.getDownloadUrls(WORLD, params);
                return result;
            }
            return null;
        }
        throw new NotFound('Geostore not found');
    }

    async getWorldWithGeojson(geojson: Record<string, any>, period: string = defaultDate()): Promise<Record<string, any>> {
        logger.debug('Executing query in cartodb with geojson', geojson);
        const periods: string[] = period.split(',');
        const params: Record<string, any> = {
            geojson: JSON.stringify(geojson.features[0].geometry),
            begin: periods[0],
            end: periods[1]
        };
        const data: Record<string, any> = await executeThunk(this.client, WORLD, params);
        logger.debug('data', data);
        const dataArea: Record<string, any> = await executeThunk(this.client, AREA, params);
        const result: Record<string, any> = {
            area_ha: dataArea.rows[0].area_ha
        };
        if (data.rows) {
            result.value = data.rows[0].value || 0;

        }
        result.area_ha = dataArea.rows[0].area_ha;
        result.downloadUrls = this.getDownloadUrls(WORLD, params);
        return result;
    }

    async latest(limit: string = "3"): Promise<Record<string, any> | null> {
        const parsedLimit: number = parseInt(limit, 10);
        logger.debug('Obtaining latest with limit %s', parsedLimit);
        const params: { limit: number } = {
            limit: parsedLimit
        };
        const data: Record<string, any> = await executeThunk(this.client, LATEST, params);

        if (data.rows) {
            return data.rows;
        }
        return null;
    }

}

export default new CartoDBService();
