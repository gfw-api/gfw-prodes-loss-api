'use strict';
var logger = require('logger');
var path = require('path');
var config = require('config');
var CartoDB = require('cartodb');
var Mustache = require('mustache');
var NotFound = require('errors/notFound');
var JSONAPIDeserializer = require('jsonapi-serializer').Deserializer;

const WORLD = `SELECT round(sum(f.areameters)/10000) AS value
            {{additionalSelect}}
        FROM prodes_wgs84 f
        WHERE to_date(f.ano, 'YYYY') >= '{{begin}}'::date
              AND to_date(f.ano, 'YYYY') < '{{end}}'::date
              AND ST_INTERSECTS(
                ST_SetSRID(
                  ST_GeomFromGeoJSON('{{{geojson}}}'), 4326), f.the_geom)`;

const ISO = `with s as (
            SELECT st_simplify(the_geom, 0.0001) as the_geom
            FROM gadm2_provinces_simple
            WHERE iso = UPPER('{{iso}}'))
        SELECT round(sum(f.areameters)/10000) AS value
            {{additionalSelect}}
        FROM prodes_wgs84 f, s
        WHERE  to_date(f.ano, 'YYYY') >= '{{begin}}'::date
        AND to_date(f.ano, 'YYYY') < '{{end}}'::date
        AND st_intersects(f.the_geom, s.the_geom) `;

const ID1 = ` with s as (
            SELECT st_simplify(the_geom, 0.0001) as the_geom
            FROM gadm2_provinces_simple
            WHERE iso = UPPER('{{iso}}') AND id_1 = {{id1}})
        SELECT round(sum(f.areameters)/10000) AS value
        	{{additionalSelect}}
        FROM prodes_wgs84 f, s
        WHERE  to_date(f.ano, 'YYYY') >= '{{begin}}'::date
        AND to_date(f.ano, 'YYYY') < '{{end}}'::date
        AND st_intersects(f.the_geom, s.the_geom) `;

const USE = `SELECT round(sum(f.areameters)/10000) AS value
            {{additionalSelect}}
        FROM {{useTable}} u, prodes_wgs84 f
        WHERE u.cartodb_id = {{pid}}
              AND ST_Intersects(f.the_geom, u.the_geom)
              AND to_date(f.ano, 'YYYY') >= '{{begin}}'::date
              AND to_date(f.ano, 'YYYY') < '{{end}}'::date `;

const WDPA = `SELECT round(sum(f.areameters)/10000) AS value
            {{additionalSelect}}
        FROM prodes_wgs84 f, (SELECT CASE when marine::numeric = 2 then null
        when ST_NPoints(the_geom)<=18000 THEN the_geom
       WHEN ST_NPoints(the_geom) BETWEEN 18000 AND 50000 THEN ST_RemoveRepeatedPoints(the_geom, 0.001)
      ELSE ST_RemoveRepeatedPoints(the_geom, 0.005)
       END as the_geom FROM wdpa_protected_areas where wdpaid={{wdpaid}}) AS p
        WHERE ST_Intersects(f.the_geom, p.the_geom)
              and to_date(f.ano, 'YYYY') >= '{{begin}}'::date
              AND to_date(f.ano, 'YYYY') < '{{end}}'::date `;

const LATEST = `SELECT DISTINCT ano
        FROM prodes_wgs84
        WHERE ano IS NOT NULL
        ORDER BY ano DESC
        LIMIT {{limit}}`;

var executeThunk = function(client, sql, params) {
    return function(callback) {
        logger.debug(Mustache.render(sql, params));
        client.execute(sql, params).done(function(data) {
            callback(null, data);
        }).error(function(err) {
            callback(err, null);
        });
    };
};

var deserializer = function(obj) {
    return function(callback) {
        new JSONAPIDeserializer().deserialize(obj, callback);
    };
};


let getToday = function() {
    let today = new Date();
    return `${today.getFullYear().toString()}-${(today.getMonth()+1).toString()}-${today.getDate().toString()}`;
};

let getYesterday = function() {
    let yesterday = new Date(Date.now() - (24 * 60 * 60 * 1000));
    return `${yesterday.getFullYear().toString()}-${(yesterday.getMonth()+1).toString()}-${yesterday.getDate().toString()}`;
};


let defaultDate = function() {
    let to = getToday();
    let from = getYesterday();
    return from + ',' + to;
};

class CartoDBService {

    constructor() {
        this.client = new CartoDB.SQL({
            user: config.get('cartoDB.user')
        });
        this.apiUrl = config.get('cartoDB.apiUrl');
    }

    getDownloadUrls(query, params) {
        try{
            let formats = ['csv', 'geojson', 'kml', 'shp', 'svg'];
            let download = {};
            let queryFinal = Mustache.render(query, params);
            queryFinal = queryFinal.replace('SELECT round(sum(f.areameters)/10000) AS value', 'SELECT f.*');
            queryFinal = encodeURIComponent(queryFinal);
            for(let i=0, length = formats.length; i < length; i++){
                download[formats[i]] = this.apiUrl + '?q=' + queryFinal + '&format=' + formats[i];
            }
            return download;
        }catch(err){
            logger.error(err);
        }
    }

    getPeriodText(period) {
        let periods = period.split(',');
        let days = (new Date(periods[1]) - new Date(periods[0])) / (24 * 60 * 60 * 1000);

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
    }

    * getNational(iso, alertQuery, period = defaultDate()) {
        logger.debug('Obtaining national of iso %s', iso);
        let periods = period.split(',');
        let params = {
            iso: iso,
            begin: periods[0],
            end: periods[1]
        };

        let data = yield executeThunk(this.client, ISO, params);
        if (data.rows && data.rows.length > 0) {
            let result = data.rows[0];
            result.period = this.getPeriodText(period);
            result.downloadUrls = this.getDownloadUrls(ISO, params);
            return result;
        }
        return null;
    }

    * getSubnational(iso, id1, alertQuery, period = defaultDate()) {
        logger.debug('Obtaining subnational of iso %s and id1', iso, id1);
        let periods = period.split(',');
        let params = {
            iso: iso,
            id1: id1,
            begin: periods[0],
            end: periods[1]
        };

        let data = yield executeThunk(this.client, ID1, params);
        if (data.rows && data.rows.length > 0) {
            let result = data.rows[0];
            result.period = this.getPeriodText(period);
            result.downloadUrls = this.getDownloadUrls(ID1, params);
            return result;
        }
        return null;
    }

    * getUse(useTable, id, alertQuery, period = defaultDate()) {
        logger.debug('Obtaining use with id %s', id);
        let periods = period.split(',');
        let params = {
            useTable: useTable,
            pid: id,
            begin: periods[0],
            end: periods[1]
        };

        let data = yield executeThunk(this.client, USE, params);

        if (data.rows && data.rows.length > 0) {
            let result = data.rows[0];
            result.period = this.getPeriodText(period);
            result.downloadUrls = this.getDownloadUrls(USE, params);
            return result;
        }
        return null;
    }

    * getWdpa(wdpaid, alertQuery, period = defaultDate()) {
        logger.debug('Obtaining wpda of id %s', wdpaid);
        let periods = period.split(',');
        let params = {
            wdpaid: wdpaid,
            begin: periods[0],
            end: periods[1]
        };

        let data = yield executeThunk(this.client, WDPA, params);
        if (data.rows && data.rows.length > 0) {
            let result = data.rows[0];
            result.period = this.getPeriodText(period);
            result.downloadUrls = this.getDownloadUrls(WDPA, params);
            return result;
        }
        return null;
    }

    * getGeostore(hashGeoStore) {
        logger.debug('Obtaining geostore with hash %s', hashGeoStore);
        let result = yield require('microservice-client').requestToMicroservice({
            uri: '/geostore/' + hashGeoStore,
            method: 'GET',
            json: true
        });
        if (result.statusCode !== 200) {
            console.error('Error obtaining geostore:');
            console.error(result);
            return null;
        }
        return yield deserializer(result.body);
    }

    * getWorld(hashGeoStore, alertQuery, period = defaultDate()) {
        logger.debug('Obtaining world with hashGeoStore %s', hashGeoStore);

        let geostore = yield this.getGeostore(hashGeoStore);
        if (geostore && geostore.geojson) {
            logger.debug('Executing query in cartodb with geostore', geostore);
            let periods = period.split(',');
            let params = {
                geojson: JSON.stringify(geostore.geojson.features[0].geometry),
                begin: periods[0],
                end: periods[1]
            };

            let data = yield executeThunk(this.client, WORLD, params);
            if (data.rows && data.rows.length > 0) {
                let result = data.rows[0];
                result.period = this.getPeriodText(period);
                result.downloadUrls = this.getDownloadUrls(WORLD, params);
                return result;
            }
            return null;
        }
        throw new NotFound('Geostore not found');
    }

    * latest(limit=3) {
        logger.debug('Obtaining latest with limit %s', limit);
        let params = {
            limit: limit
        };
        let data = yield executeThunk(this.client, LATEST, params);
        
        if (data.rows ) {
            let result = data.rows;
            return result;
        }
        return null;
    }

}

module.exports = new CartoDBService();