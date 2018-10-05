
'use strict';

var logger = require('logger');
var JSONAPISerializer = require('jsonapi-serializer').Serializer;
var prodesLossSerializer = new JSONAPISerializer('prodes-loss', {
    attributes: ['value', 'period', 'min_date', 'max_date', 'downloadUrls', 'area_ha'],
    typeForAttribute: function(attribute, record) {
        return attribute;
    },
    downloadUrls: {
        attributes: ['csv', 'geojson', 'kml', 'shp', 'svg']
    },
    keyForAttribute: 'camelCase'
});

var prodesLatestSerializerV2 = new JSONAPISerializer('prodes-latest', {
    attributes: ['latest'],
    typeForAttribute: function(attribute, record) {
        return attribute;
    }
});

class ProdesLossSerializer {

    static serialize(data) {
        return prodesLossSerializer.serialize(data);
    }
    static serializeLatest(data) {
        return prodesLatestSerializerV2.serialize(data);
    }
}

module.exports = ProdesLossSerializer;
