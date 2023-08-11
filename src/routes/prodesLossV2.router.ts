import Router from 'koa-router';
import logger from 'logger';
import { Context, Next } from 'koa';
import ProdesLossV2Serializer from "serializers/prodesLossV2.serializer";
import CartoDBServiceV2 from "services/cartoDBServiceV2";
import NotFound from "errors/notFound";


const routerV2: Router = new Router({
    prefix: '/api/v2/prodes-loss'
});

class ProdesLossRouter {

    static async getAdm0(ctx: Context): Promise<void> {
        logger.info('Obtaining national data');
        const data: Record<string, any> | void = await CartoDBServiceV2.getAdm0(ctx.params.iso, ctx.query.period as string);

        // TODO: null values should be better handled
        ctx.response.body = ProdesLossV2Serializer.serialize(data as Record<string, any>);
    }

    static async getAdm1(ctx: Context): Promise<void> {
        logger.info('Obtaining subnational data');
        const data: Record<string, any> | void = await CartoDBServiceV2.getAdm1(ctx.params.iso, ctx.params.id1, ctx.query.period as string);
        // TODO: null values should be better handled
        ctx.response.body = ProdesLossV2Serializer.serialize(data as Record<string, any>);
    }

    static async getAdm2(ctx: Context): Promise<void> {
        logger.info('Obtaining subnational data');
        const data: Record<string, any> | void = await CartoDBServiceV2.getAdm2(ctx.params.iso, ctx.params.id1, ctx.params.id2, ctx.query.period as string);
        // TODO: null values should be better handled
        ctx.response.body = ProdesLossV2Serializer.serialize(data as Record<string, any>);
    }

    static async use(ctx: Context): Promise<void> {
        logger.info('Obtaining use data with name %s and id %s', ctx.params.name, ctx.params.id);
        if (!ctx.params.name) {
            ctx.throw(404, 'Name not found');
        }
        const data: Record<string, any> | void = await CartoDBServiceV2.getUse(
            ctx.params.name,
            ctx.params.id,
            ctx.query.period as string,
            ctx.request.headers['x-api-key'] as string
        );
        // TODO: null values should be better handled
        ctx.response.body = ProdesLossV2Serializer.serialize(data as Record<string, any>);
    }

    static async wdpa(ctx: Context): Promise<void> {
        logger.info('Obtaining wpda data with id %s', ctx.params.id);
        const data: Record<string, any> | void = await CartoDBServiceV2.getWdpa(
            ctx.params.id,
            ctx.query.period as string,
            ctx.request.headers['x-api-key'] as string
        );

        // TODO: null values should be better handled
        ctx.response.body = ProdesLossV2Serializer.serialize(data as Record<string, any>);
    }

    static async world(ctx: Context): Promise<void> {
        logger.info('Obtaining world data');
        ctx.assert(ctx.query.geostore, 400, 'GeoJSON param required');
        try {
            const data: Record<string, any> | void = await CartoDBServiceV2.getWorld(
                ctx.query.geostore as string,
                ctx.query.period as string,
                ctx.request.headers['x-api-key'] as string
            );

            // TODO: null values should be better handled
            ctx.response.body = ProdesLossV2Serializer.serialize(data as Record<string, any>);
        } catch (err) {
            if (err instanceof NotFound) {
                ctx.throw(404, 'Geostore not found');
                return;
            }
            throw err;
        }

    }

    static checkGeojson(geojson: Record<string, any>): Record<string, any> {
        if (geojson.type.toLowerCase() === 'polygon') {
            return {
                type: 'FeatureCollection',
                features: [{
                    type: 'Feature',
                    geometry: geojson
                }]
            };
        }
        if (geojson.type.toLowerCase() === 'feature') {
            return {
                type: 'FeatureCollection',
                features: [geojson]
            };
        }
        return geojson;
    }

    static async worldWithGeojson(ctx: Context): Promise<void> {
        logger.info('Obtaining world data with geostore');
        ctx.assert((ctx.request.body as Record<string, any>).geojson, 400, 'GeoJSON param required');
        try {
            const data: Record<string, any> = await CartoDBServiceV2.getWorldWithGeojson(
                ProdesLossRouter.checkGeojson((ctx.request.body as Record<string, any>).geojson),
                ctx.query.period as string
            );

            // TODO: null values should be better handled
            ctx.response.body = ProdesLossV2Serializer.serialize(data as Record<string, any>);
        } catch (err) {
            if (err instanceof NotFound) {
                ctx.throw(404, 'Geostore not found');
                return;
            }
            throw err;
        }

    }

    static async latest(ctx: Context): Promise<void> {
        logger.info('Obtaining latest data');
        const data: Record<string, any> = await CartoDBServiceV2.latest();
        ctx.response.body = ProdesLossV2Serializer.serializeLatest(data);
    }

}

const isCached = async (ctx: Context, next: Next): Promise<void> => {
    if (await ctx.cashed()) {
        return;
    }
    await next();
};


routerV2.get('/admin/:iso', isCached, ProdesLossRouter.getAdm0);
routerV2.get('/admin/:iso/:id1', isCached, ProdesLossRouter.getAdm1);
routerV2.get('/admin/:iso/:id1/:id2', isCached, ProdesLossRouter.getAdm2);
routerV2.get('/use/:name/:id', isCached, ProdesLossRouter.use);
routerV2.get('/wdpa/:id', isCached, ProdesLossRouter.wdpa);
routerV2.get('/', isCached, ProdesLossRouter.world);
routerV2.post('/', ProdesLossRouter.worldWithGeojson);
routerV2.get('/latest', isCached, ProdesLossRouter.latest);


export default routerV2;
