'use strict';

var assert = require('assert');

var Class = require('./class');
var Base = require('./base');
var Record = require('./record');
var Table = require('./table');
var AirtableError = require('./airtable_error');

var Airtable = Class.extend({
    /**
     * @class Airtable
     * @param {AirtableConfig} opts - the configuration options available to the Airtable class.  This is the first object you should create when working with the SDK.
     */
    init: function(opts) {
        opts = opts || {};

        /**
         * @typedef AirtableConfig
         * @memberof Airtable
         * @property {String} apiKey - your Airtable API key.  By default, the SDK pulls this from the AIRTABLE_API_KEY environment variable
         * @property {String} endpointUrl - the base URL for the Airtable API.  Defaults to https://api.airtable.com
         * @property {String} apiVersion - the API version you want to use.  Airtable's current API Version is "v0".
         * @property {Boolean} allowUnauthorizedSsl -  If not false, the server certificate is verified against the list of supplied CAs. An error occurs if the verification fails.  Otherwise, calls will succeed even if SSL verification fails (for example, when using a self-signed certificate).  Defaults to false. 
         * @property {Boolean} noRetryIfRateLimited - If not false, you are responsible for managing errors with errorCode 429 when you exceed the API rate limit.  Otherwise, the Airtable SDK will manage the timeout logic.  Defaults to false (Airtable SDK manages timeouts by default).
         * @property {Number} requestTimeout - number of miliseconds to wait before timing out the request.  Defaults to 300,000 (5 minutes)
         */
        var default_config = Airtable.default_config();

        this._apiKey = opts.apiKey || Airtable.apiKey || default_config.apiKey;
        this._endpointUrl = opts.endpointUrl || Airtable.endpointUrl || default_config.endpointUrl;
        this._apiVersion = opts.apiVersion || Airtable.apiVersion || default_config.apiVersion;
        this._apiVersionMajor = this._apiVersion.split('.')[0];
        this._allowUnauthorizedSsl = opts.allowUnauthorizedSsl || Airtable.allowUnauthorizedSsl || default_config.allowUnauthorizedSsl;
        this._noRetryIfRateLimited = opts.noRetryIfRateLimited || Airtable.noRetryIfRateLimited || default_config.noRetryIfRateLimited;
        this.requestTimeout = opts.requestTimeout || default_config.requestTimeout;

        assert(this._apiKey, 'API key is required to connect to Airtable');
    },

    base: function(baseId) {
        return Base.createFunctor(this, baseId);
    }
});

Airtable.default_config = function () {
    return {
        endpointUrl: process.env.AIRTABLE_ENDPOINT_URL || 'https://api.airtable.com',
        apiVersion: '0.1.0',
        apiKey: process.env.AIRTABLE_API_KEY,
        allowUnauthorizedSsl: false,
        noRetryIfRateLimited: false,
        requestTimeout: 300 * 1000, // 5 minutes
    };
};

Airtable.configure = function(opts) {
    Airtable.apiKey = opts.apiKey;
    Airtable.endpointUrl = opts.endpointUrl;
    Airtable.apiVersion = opts.apiVersion;
    Airtable.allowUnauthorizedSsl = opts.allowUnauthorizedSsl;
    Airtable.noRetryIfRateLimited = opts.noRetryIfRateLimited;
};

Airtable.base = function(baseId) {
    return new Airtable().base(baseId);
};

Airtable.Base = Base;
Airtable.Record = Record;
Airtable.Table = Table;
Airtable.Error = AirtableError;

module.exports = Airtable;


