'use strict';

var logger = require('logger');
var JSONAPISerializer = require('jsonapi-serializer').Serializer;
var prodesLossSerializer = new JSONAPISerializer('prodes-loss', {
    attributes: ['value', 'period', 'min_date', 'max_date', 'downloadUrls'],
    typeForAttribute: function(attribute, record) {
        return attribute;
    },
    downloadUrls: {
        attributes: ['csv', 'geojson', 'kml', 'shp', 'svg']
    }
});

var prodesLatestSerializer = new JSONAPISerializer('prodes-latest', {
    attributes: ['ano'],
    typeForAttribute: function(attribute, record) {
        return attribute;
    }
});

class ProdesLossSerializer {

    static serialize(data) {
        return prodesLossSerializer.serialize(data);
    }
    static serializeLatest(data) {
        return prodesLatestSerializer.serialize(data);
    }
}

module.exports = ProdesLossSerializer;
