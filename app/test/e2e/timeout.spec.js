const nock = require('nock');
const chai = require('chai');
const { getTestServer } = require('./utils/test-server');
const {
    mockGeostoreRequest,
    mockTimeoutCartoDBRequest,
    mockErrorCartoDBRequest,
} = require('./utils/mocks');

chai.should();

let requester;

nock.disableNetConnect();
nock.enableNetConnect(process.env.HOST_IP);

describe('CartoDB timeout handling', () => {
    before(async () => {
        if (process.env.NODE_ENV !== 'test') {
            throw Error(`Running the test suite with NODE_ENV ${process.env.NODE_ENV} may result in permanent data loss. Please use NODE_ENV=test.`);
        }

        requester = await getTestServer();
    });

    it('GFW Prodes handles CartoDB timeouts graciously, returning 429 with an appropriate error message', async () => {
        mockGeostoreRequest('/v1/geostore/admin/BRA');
        mockTimeoutCartoDBRequest();

        const response = await requester.get('/api/v1/prodes-loss/admin/BRA?period=2001-01-01%2C2020-12-31&thresh=30');
        response.status.should.equal(429);
        response.body.should.be.an('object').and.have.property('errors');
        response.body.errors.should.be.an('array').and.have.length(1);
        response.body.errors[0].should.equal('SQL query timeout error. Refactor your query and try running again.');
    });

    it('GFW Prodes returns 500 Internal Server Error with an appropriate error message if an error occurs on the request to CartoDB', async () => {
        mockGeostoreRequest('/v1/geostore/admin/BRA');
        mockErrorCartoDBRequest();

        const response = await requester.get('/api/v1/prodes-loss/admin/BRA?period=2001-01-01%2C2020-12-31&thresh=30');
        response.status.should.equal(500);
        response.body.should.be.an('object').and.have.property('errors');
        response.body.errors.should.be.an('array').and.have.length(1);
        response.body.errors[0].should.equal('An error has occurred.');
    });

    afterEach(() => {
        if (!nock.isDone()) {
            throw new Error(`Not all nock interceptors were used: ${nock.pendingMocks()}`);
        }
    });
});
