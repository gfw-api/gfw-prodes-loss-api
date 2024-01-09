import { Serializer } from 'jsonapi-serializer';

const prodesLossSerializer: Serializer = new Serializer('prodes-loss', {
    attributes: ['value', 'period', 'min_date', 'max_date', 'downloadUrls', 'area_ha'],
    typeForAttribute: (attribute: string) => attribute,
    downloadUrls: {
        attributes: ['csv', 'geojson', 'kml', 'shp', 'svg']
    },
    keyForAttribute: 'camelCase'
});

const prodesLatestSerializer: Serializer = new Serializer('prodes-latest', {
    attributes: ['ano'],
    typeForAttribute: (attribute: string) => attribute,
});

class ProdesLossV1Serializer {

    static serialize(data: Record<string, any>): Record<string, any> {
        return prodesLossSerializer.serialize(data);
    }

    static serializeLatest(data: Record<string, any>): Record<string, any> {
        return prodesLatestSerializer.serialize(data);
    }

}

export default ProdesLossV1Serializer;
