const JSONAPISerializer = require('jsonapi-serializer').Serializer;

const prodesLossSerializer = new JSONAPISerializer('prodes-loss', {
    attributes: ['value', 'period', 'min_date', 'max_date', 'downloadUrls', 'area_ha'],
    typeForAttribute(attribute) {
        return attribute;
    },
    downloadUrls: {
        attributes: ['csv', 'geojson', 'kml', 'shp', 'svg']
    },
    keyForAttribute: 'camelCase'
});

const prodesLatestSerializer = new JSONAPISerializer('prodes-latest', {
    attributes: ['ano'],
    typeForAttribute(attribute) {
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
