import config from 'config';
import nock from 'nock';
import { mockCloudWatchLogRequest, mockValidateRequest } from "rw-api-microservice-node/dist/test-mocks";
import { ApplicationValidationResponse } from "rw-api-microservice-node/dist/types";

export const mockGeostoreRequest = (path: string): void => {
    nock(process.env.GATEWAY_URL, { reqheaders: {'x-api-key': 'api-key-test' } })
        .get(path)
        .reply(200, {
            data: {
                type: 'geoStore',
                id: 'a86236811c4ba13e0e70b8d94547e09d',
                attributes: {
                    geojson: {
                        crs: {},
                        type: 'FeatureCollection',
                        features: [
                            {
                                geometry: {
                                    coordinates: [
                                        [
                                            [
                                                [
                                                    -43.6725362197416,
                                                    -2.30173635989672
                                                ],
                                                [
                                                    -43.6715278625488,
                                                    -2.30597305297852
                                                ],
                                                [
                                                    -43.6801376342772,
                                                    -2.31569409370422
                                                ],
                                                [
                                                    -43.6790275573729,
                                                    -2.32513904571528
                                                ],
                                                [
                                                    -43.6826400756835,
                                                    -2.32847309112543
                                                ],
                                                [
                                                    -43.6787490844725,
                                                    -2.33236098289484
                                                ],
                                                [
                                                    -43.6793060302734,
                                                    -2.34014010429382
                                                ],
                                                [
                                                    -43.6843070983887,
                                                    -2.34402799606323
                                                ],
                                                [
                                                    -43.6806945800781,
                                                    -2.34569406509388
                                                ],
                                                [
                                                    -43.672637939453,
                                                    -2.34097194671631
                                                ],
                                                [
                                                    -43.6751403808594,
                                                    -2.33152699470514
                                                ],
                                                [
                                                    -43.670970916748,
                                                    -2.32569503784174
                                                ],
                                                [
                                                    -43.6568069458007,
                                                    -2.33152699470514
                                                ],
                                                [
                                                    -43.6645851135254,
                                                    -2.32541704177851
                                                ],
                                                [
                                                    -43.6645851135254,
                                                    -2.31902790069574
                                                ],
                                                [
                                                    -43.6390266418457,
                                                    -2.30847096443165
                                                ],
                                                [
                                                    -43.6290283203123,
                                                    -2.306804895401
                                                ],
                                                [
                                                    -43.6248626708983,
                                                    -2.30986189842213
                                                ],
                                                [
                                                    -43.6240272521973,
                                                    -2.31819391250605
                                                ],
                                                [
                                                    -43.631248474121,
                                                    -2.32902693748468
                                                ],
                                                [
                                                    -43.6268043518066,
                                                    -2.3304169178009
                                                ],
                                                [
                                                    -43.6290283203123,
                                                    -2.35986089706415
                                                ],
                                                [
                                                    -43.6387481689451,
                                                    -2.36819410324091
                                                ],
                                                [
                                                    -43.6406936645507,
                                                    -2.37958288192743
                                                ],
                                                [
                                                    -43.6445846557617,
                                                    -2.37986111640919
                                                ],
                                                [
                                                    -43.6387481689451,
                                                    -2.38569498062134
                                                ],
                                                [
                                                    -43.6434707641602,
                                                    -2.3948619365691
                                                ],
                                                [
                                                    -43.6370849609375,
                                                    -2.39152789115894
                                                ],
                                                [
                                                    -43.6409721374511,
                                                    -2.39930605888361
                                                ],
                                                [
                                                    -43.6387481689451,
                                                    -2.40208506584167
                                                ],
                                                [
                                                    -43.6440277099608,
                                                    -2.40235996246338
                                                ],
                                                [
                                                    -43.6443061828613,
                                                    -2.39625000953669
                                                ],
                                                [
                                                    -43.6468048095703,
                                                    -2.40347290039062
                                                ],
                                                [
                                                    -43.6540260314941,
                                                    -2.4015278816222
                                                ],
                                                [
                                                    -43.6498603820801,
                                                    -2.39652800559992
                                                ],
                                                [
                                                    -43.6637496948242,
                                                    -2.40263795852655
                                                ],
                                                [
                                                    -43.6654167175293,
                                                    -2.39763808250427
                                                ],
                                                [
                                                    -43.6570816040038,
                                                    -2.38986206054682
                                                ],
                                                [
                                                    -43.6576385498045,
                                                    -2.38263893127441
                                                ],
                                                [
                                                    -43.6612510681152,
                                                    -2.38152694702148
                                                ],
                                                [
                                                    -43.6745834350586,
                                                    -2.39374995231623
                                                ],
                                                [
                                                    -43.6770820617676,
                                                    -2.39180588722218
                                                ],
                                                [
                                                    -43.6731948852538,
                                                    -2.3948619365691
                                                ],
                                                [
                                                    -43.6601371765136,
                                                    -2.38291692733765
                                                ],
                                                [
                                                    -43.6593055725098,
                                                    -2.38930511474604
                                                ],
                                                [
                                                    -43.6656951904297,
                                                    -2.39208388328552
                                                ],
                                                [
                                                    -43.6706962585448,
                                                    -2.40041589736933
                                                ],
                                                [
                                                    -43.6845817565918,
                                                    -2.3979160785675
                                                ],
                                                [
                                                    -43.6868057250977,
                                                    -2.39097189903248
                                                ],
                                                [
                                                    -43.6904182434082,
                                                    -2.40708303451527
                                                ],
                                                [
                                                    -43.7004165649414,
                                                    -2.41041707992548
                                                ],
                                                [
                                                    -43.7109718322753,
                                                    -2.42763805389404
                                                ],
                                                [
                                                    -43.7437515258787,
                                                    -2.41624903678888
                                                ],
                                                [
                                                    -43.7490272521972,
                                                    -2.40680503845209
                                                ],
                                                [
                                                    -43.7481956481934,
                                                    -2.40041589736933
                                                ],
                                                [
                                                    -43.7443046569824,
                                                    -2.39541602134705
                                                ],
                                                [
                                                    -43.7337493896484,
                                                    -2.39402794837946
                                                ],
                                                [
                                                    -43.7268066406249,
                                                    -2.38680505752552
                                                ],
                                                [
                                                    -43.7306938171384,
                                                    -2.3698620796203
                                                ],
                                                [
                                                    -43.724582672119,
                                                    -2.37319397926325
                                                ],
                                                [
                                                    -43.7206954956054,
                                                    -2.36847209930414
                                                ],
                                                [
                                                    -43.7273597717285,
                                                    -2.36819410324091
                                                ],
                                                [
                                                    -43.7295837402344,
                                                    -2.35986089706415
                                                ],
                                                [
                                                    -43.7262496948242,
                                                    -2.35902690887445
                                                ],
                                                [
                                                    -43.7395820617675,
                                                    -2.35097289085377
                                                ],
                                                [
                                                    -43.7243041992185,
                                                    -2.32958292961109
                                                ],
                                                [
                                                    -43.7201385498046,
                                                    -2.31597208976746
                                                ],
                                                [
                                                    -43.7154159545898,
                                                    -2.31652808189392
                                                ],
                                                [
                                                    -43.7234725952147,
                                                    -2.30902695655811
                                                ],
                                                [
                                                    -43.720417022705,
                                                    -2.3009729385376
                                                ],
                                                [
                                                    -43.7112503051757,
                                                    -2.29902696609497
                                                ],
                                                [
                                                    -43.7170829772948,
                                                    -2.29319405555725
                                                ],
                                                [
                                                    -43.7118072509764,
                                                    -2.28819394111628
                                                ],
                                                [
                                                    -43.716251373291,
                                                    -2.28791594505304
                                                ],
                                                [
                                                    -43.6831932067869,
                                                    -2.27569508552551
                                                ],
                                                [
                                                    -43.6845817565918,
                                                    -2.27347302436829
                                                ],
                                                [
                                                    -43.6812515258789,
                                                    -2.27208304405212
                                                ],
                                                [
                                                    -43.6601371765136,
                                                    -2.26652789115906
                                                ],
                                                [
                                                    -43.6340293884277,
                                                    -2.25236105918884
                                                ],
                                                [
                                                    -43.6237487792969,
                                                    -2.25124907493591
                                                ],
                                                [
                                                    -43.6112518310547,
                                                    -2.25236105918884
                                                ],
                                                [
                                                    -43.6231956481934,
                                                    -2.25541806221008
                                                ],
                                                [
                                                    -43.605972290039,
                                                    -2.25791597366322
                                                ],
                                                [
                                                    -43.6123619079589,
                                                    -2.26180601119995
                                                ],
                                                [
                                                    -43.6012496948242,
                                                    -2.2651379108429
                                                ],
                                                [
                                                    -43.6015281677246,
                                                    -2.2698609828949
                                                ],
                                                [
                                                    -43.6218070983886,
                                                    -2.27847099304199
                                                ],
                                                [
                                                    -43.6404151916504,
                                                    -2.27569508552551
                                                ],
                                                [
                                                    -43.6548614501953,
                                                    -2.29263806343079
                                                ],
                                                [
                                                    -43.6662483215331,
                                                    -2.30041694641113
                                                ],
                                                [
                                                    -43.6665267944335,
                                                    -2.3045830726623
                                                ],
                                                [
                                                    -43.6725362197416,
                                                    -2.30173635989672
                                                ]
                                            ],
                                        ]
                                    ],
                                    type: 'MultiPolygon'
                                },
                                type: 'Feature',
                                properties: null
                            }
                        ]
                    },
                    hash: 'a86236811c4ba13e0e70b8d94547e09d',
                    provider: {},
                    areaHa: 855189203.6641197,
                    bbox: [
                        -73.9882431030273,
                        -33.7470817565917,
                        -28.8472194671629,
                        5.2648777961731
                    ],
                    lock: false,
                    info: {
                        use: {},
                        iso: 'BRA',
                        id1: null,
                        id2: null,
                        gadm: '2.8',
                        name: 'Brazil'
                    }
                }
            }
        });
};

export const mockTimeoutCartoDBRequest = () => {
    nock(`https://${config.get('cartoDB.user')}.cartodb.com`)
        .get('/api/v2/sql')
        .query(() => true)
        .reply(429, {
            error: ['You are over platform\'s limits: SQL query timeout error. Refactor your query before running again or contact CARTO support for more details.'],
            context: 'limit',
            detail: 'datasource'
        });
};

export const mockErrorCartoDBRequest = () => {
    nock(`https://${config.get('cartoDB.user')}.cartodb.com`)
        .get('/api/v2/sql')
        .query(() => true)
        .reply(500, {
            error: ['An error has occurred.'],
        });
};

const APPLICATION: ApplicationValidationResponse = {
    data: {
        type: "applications",
        id: "649c4b204967792f3a4e52c9",
        attributes: {
            name: "grouchy-armpit",
            organization: null,
            user: null,
            apiKeyValue: "a1a9e4c3-bdff-4b6b-b5ff-7a60a0454e13",
            createdAt: "2023-06-28T15:00:48.149Z",
            updatedAt: "2023-06-28T15:00:48.149Z"
        }
    }
};

export const mockValidateRequestWithApiKey = ({
                                           apiKey = 'api-key-test',
                                           application = APPLICATION
                                       }) => {
    mockValidateRequest({
        gatewayUrl: process.env.GATEWAY_URL,
        microserviceToken: process.env.MICROSERVICE_TOKEN,
        application,
        apiKey
    });
    mockCloudWatchLogRequest({
        application,
        awsRegion: process.env.AWS_REGION,
        logGroupName: process.env.CLOUDWATCH_LOG_GROUP_NAME,
        logStreamName: config.get('service.name')
    });
};
