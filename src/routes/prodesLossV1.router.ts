import Router from 'koa-router';
import logger from 'logger';
import { Context, Next } from 'koa';
import CartoDBService from "services/cartoDBService";
import ProdesLossV1Serializer from "serializers/prodesLossV1.serializer";
import NotFound from "errors/notFound";


const routerV1: Router = new Router({
    prefix: '/api/v1/prodes-loss'
});

class ProdesLossRouter {

    static async getNational(ctx: Context): Promise<void> {
        logger.info('Obtaining national data');
        try {
            const data: Record<string, any> | void = await CartoDBService.getNational(
                ctx.params.iso,
                ctx.request.query.period as string,
                ctx.request.headers['x-api-key'] as string
            );

            // TODO: null values should be better handled
            ctx.response.body = ProdesLossV1Serializer.serialize(data as Record<string, any>);
        } catch (err) {
            if (Array.isArray(err) && err.includes('You are over platform\'s limits: SQL query timeout error. Refactor your query before running again or contact CARTO support for more details.')) {
                ctx.response.body = { errors: ['SQL query timeout error. Refactor your query and try running again.'] };
                ctx.status = 429;
            } else {
                ctx.response.body = { errors: err };
                ctx.status = 500;
            }
        }
    }

    static async getSubnational(ctx: Context): Promise<void> {
        logger.info('Obtaining subnational data');
        const data: Record<string, any> | void = await CartoDBService.getSubnational(
            ctx.params.iso,
            ctx.params.id1,
            ctx.request.query.period as string,
            ctx.request.headers['x-api-key'] as string
        );

        // TODO: null values should be better handled
        ctx.response.body = ProdesLossV1Serializer.serialize(data as Record<string, any>);
    }

    static async use(ctx: Context): Promise<void> {
        logger.info('Obtaining use data with name %s and id %s', ctx.params.name, ctx.params.id);
        let useTable: string;
        switch (ctx.params.name) {

            case 'mining':
                useTable = 'gfw_mining';
                break;
            case 'oilpalm':
                useTable = 'gfw_oil_palm';
                break;
            case 'fiber':
                useTable = 'gfw_wood_fiber';
                break;
            case 'logging':
                useTable = 'gfw_logging';
                break;
            default:
                useTable = ctx.params.name;

        }
        if (!useTable) {
            ctx.throw(404, 'Name not found');
        }
        const data: Record<string, any> | void = await CartoDBService.getUse(
            ctx.params.name,
            useTable,
            ctx.params.id,
            ctx.request.query.period as string,
            ctx.request.headers['x-api-key'] as string
        );

        // TODO: null values should be better handled
        ctx.response.body = ProdesLossV1Serializer.serialize(data as Record<string, any>);

    }

    static async wdpa(ctx: Context): Promise<void> {
        logger.info('Obtaining wpda data with id %s', ctx.params.id);
        const data: Record<string, any> | void = await CartoDBService.getWdpa(
            ctx.params.id,
            ctx.request.query.period as string,
            ctx.request.headers['x-api-key'] as string
        );

        // TODO: null values should be better handled
        ctx.response.body = ProdesLossV1Serializer.serialize(data as Record<string, any>);
    }

    static async world(ctx: Context): Promise<void> {
        logger.info('Obtaining world data');
        ctx.assert(ctx.request.query.geostore, 400, 'GeoJSON param required');
        try {
            const data: Record<string, any> | void = await CartoDBService.getWorld(
                ctx.request.query.geostore as string,
                ctx.request.query.period as string,
                ctx.request.headers['x-api-key'] as string
            );

            // TODO: null values should be better handled
            ctx.response.body = ProdesLossV1Serializer.serialize(data as Record<string, any>);
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
            const data: Record<string, any> = await CartoDBService.getWorldWithGeojson(
                ProdesLossRouter.checkGeojson((ctx.request.body as Record<string, any>).geojson),
                ctx.request.query.period as string,
            );

            // TODO: null values should be better handled
            ctx.response.body = ProdesLossV1Serializer.serialize(data as Record<string, any>);
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
        const data: Record<string, any> | null = await CartoDBService.latest();

        // TODO: null values should be better handled
        ctx.response.body = ProdesLossV1Serializer.serialize(data as Record<string, any>);
    }

}

const isCached = async (ctx: Context, next: Next): Promise<void> => {
    if (await ctx.cashed()) {
        return;
    }
    await next();
};


routerV1.get('/admin/:iso', isCached, ProdesLossRouter.getNational);
routerV1.get('/admin/:iso/:id1', isCached, ProdesLossRouter.getSubnational);
routerV1.get('/use/:name/:id', isCached, ProdesLossRouter.use);
routerV1.get('/wdpa/:id', isCached, ProdesLossRouter.wdpa);
routerV1.get('/', isCached, ProdesLossRouter.world);
routerV1.post('/', ProdesLossRouter.worldWithGeojson);
routerV1.get('/latest', isCached, ProdesLossRouter.latest);


export default routerV1;
