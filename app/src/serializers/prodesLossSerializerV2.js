const JSONAPISerializer = require('jsonapi-serializer').Serializer;

const prodesLossSerializerV2 = new JSONAPISerializer('prodes-loss', {
    attributes: ['value', 'period', 'min_date', 'max_date', 'downloadUrls', 'area_ha'],
    typeForAttribute(attribute) {
        return attribute;
    },
    downloadUrls: {
        attributes: ['csv', 'json', 'kml', 'shp', 'svg']
    },
    keyForAttribute: 'camelCase'
});

const prodesLatestSerializerV2 = new JSONAPISerializer('prodes-latest', {
    attributes: ['latest'],
    typeForAttribute(attribute) {
        return attribute;
    }
});

class ProdesLossSerializerV2 {

    static serialize(data) {
        return prodesLossSerializerV2.serialize(data);
    }

    static serializeLatest(data) {
        return prodesLatestSerializerV2.serialize(data);
    }

}

module.exports = ProdesLossSerializerV2;
