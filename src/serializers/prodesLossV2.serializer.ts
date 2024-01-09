import { Serializer } from 'jsonapi-serializer';


const prodesLossSerializerV2: Serializer = new Serializer('prodes-loss', {
    attributes: ['value', 'period', 'min_date', 'max_date', 'downloadUrls', 'area_ha'],
    typeForAttribute: (attribute: string) => attribute,
    downloadUrls: {
        attributes: ['csv', 'json', 'kml', 'shp', 'svg']
    },
    keyForAttribute: 'camelCase'
});

const prodesLatestSerializerV2: Serializer = new Serializer('prodes-latest', {
    attributes: ['latest'],
    typeForAttribute: (attribute: string) => attribute,
});

class ProdesLossV2Serializer {

    static serialize(data: Record<string, any>): Record<string, any> {
        return prodesLossSerializerV2.serialize(data);
    }

    static serializeLatest(data: Record<string, any>): Record<string, any> {
        return prodesLatestSerializerV2.serialize(data);
    }

}

export default ProdesLossV2Serializer;
