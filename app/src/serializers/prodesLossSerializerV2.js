
'use strict';

var logger = require('logger');
var JSONAPISerializer = require('jsonapi-serializer').Serializer;
var prodesLossSerializerV2 = new JSONAPISerializer('prodes-loss', {
    attributes: ['value', 'period', 'min_date', 'max_date', 'downloadUrls', 'area_ha'],
    typeForAttribute: function(attribute, record) {
        return attribute;
    },
    downloadUrls: {
        attributes: ['csv', 'geojson', 'kml', 'shp', 'svg']
    },
    keyForAttribute: 'camelCase'
});

var prodesLatestSerializer = new JSONAPISerializer('prodes-latest', {
    attributes: ['latest'],
    typeForAttribute: function(attribute, record) {
        return attribute;
    }
});

class ProdesLossSerializerV2 {

    static serialize(data) {
        return prodesLossSerializerV2.serialize(data);
    }
    static serializeLatest(data) {
        return prodesLatestSerializer.serialize(data);
    }
}

module.exports = ProdesLossSerializerV2;
