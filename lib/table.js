'use strict';

var isPlainObject = require('lodash/isPlainObject');
var assign = require('lodash/assign');
var forEach = require('lodash/forEach');
var map = require('lodash/map');

var assert = require('assert');

var AirtableError = require('./airtable_error');
var Class = require('./class');
var deprecate = require('./deprecate');
var Query = require('./query');
var Record = require('./record');
var callbackToPromise = require('./callback_to_promise');


var Table = Class.extend({
   /**
    * @constructor Table
    * @param {Base} base - Base object
    * @param {string} tableId - the Airtable ID for the table
    * @param {string} tableName - the name of the table.
    * 
    * @description Creates a new table object allowing you to issue CRUD operations to an Airtable table. You must provide either a tableId or tableName
    */
    init: function(base, tableId, tableName) {
        this._base = base;
        assert(tableId || tableName, 'Table name or table ID is required');
        this.id = tableId;
        this.name = tableName;

        // Public API
        /** 
         * Fetch a single record by its Airtable record ID. 
         * @function find 
         * @memberOf Table
         * @param  {string} recordId - the Airtable record ID you want to fetch
         * @param {Table~done} [done] - callback that fires once all records have been processed
         * @returns {null|Promise<Record>} executes the callback if present, returns a Promise of type {@link Record} otherwise.
         */
        this.find = callbackToPromise(this._findRecordById, this);

        /** 
         * Fetch a list of records using valid URL parameters. 
         * @function select 
         * @memberOf Table
         * @param {Object} [parameters] - an associative array containing the different URL parameters for the query.  See {@link https://airtable.com/api} for more details.
         * @returns {Query}
         */
        this.select = this._selectRecords.bind(this);

        /** 
         * Create a new record in the table.
         * @function create 
         * @param {Object} record_data - object representing the data to insert.  Each key should be a different field name in your table.
         * @param {Object} [opts] - object of optional parameters, such as "typecast" to use when creating the record
         * @param {Table~done} [done] - callback to execute once the record has been completled, or an error occurs
         * @memberOf Table
         * @returns {null|Promise<Record>} executes the callback if present, returns a Promise of type {@link Record} otherwise.
         */
        this.create = callbackToPromise(this._createRecord, this);

        /** 
         * Update certain fields in a record.  If a field is not included, it is not updated (issues a PATCH request). 
         * @function update 
         * @memberOf Table
         * @param {string} record_id - the Airtable record ID for the record you want to update
         * @param {Object} record_data - object representing the data to insert.  Each key should be a different field name in your table.
         * @param {Object} [opts] - object of optional parameters, such as "typecast" to use when creating the record
         * @param {Table~done} [done] - callback to execute once the record has been created, or an error occurs
         * @returns {null|Promise<Record>} executes the callback if present, returns a Promise of type {@link Record} otherwise.

         */
        this.update = callbackToPromise(this._updateRecord, this);

        /** 
         * Delete a record from a table.
         * @function destroy 
         * @memberOf Table
         * @param {string} record_id - the Airtable record ID for the record you want to delete
         * @param {Table~done} [done] - callback to execute once the record has been deleted or an error occurs.
         * @returns {null|Promise<Record>} executes the callback if present, returns a Promise of type {@link Record} otherwise.
         */
        this.destroy = callbackToPromise(this._destroyRecord, this);

        /**
         * Update the fields provided.  Any fields that are not included will be cleared (issues PUT request).
         * @function replace
         * @memberOf Table
         * @param {string} record_id - the Airtable record ID for the record you want to update
         * @param {Object} record_data - object representing the data to insert.  Each key should be a different field name in your table.
         * @param {Object} [opts] - object of optional parameters, such as "typecast" to use when creating the record
         * @param {Table~done} [done] - callback to execute once the record has been deleted
         * @returns {null|Promise<Record>} executes the callback if present, returns a Promise of type {@link Record} otherwise.
         */
        this.replace = callbackToPromise(this._replaceRecord, this);

        // Deprecated API
        this.list = deprecate(this._listRecords.bind(this),
            'table.list',
            'Airtable: `list()` is deprecated. Use `select()` instead.');
        this.forEach = deprecate(this._forEachRecord.bind(this),
            'table.forEach',
            'Airtable: `forEach()` is deprecated. Use `select()` instead.');
    },
    _findRecordById: function(recordId, done) {
        var record = new Record(this, recordId);
        record.fetch(done);
    },
    _selectRecords: function(params) {
        if (params === void 0) {
            params = {};
        }

        if (arguments.length > 1) {
            console.warn('Airtable: `select` takes only one parameter, but it was given ' +
                arguments.length + ' parameters. ' +
                'Use `eachPage` or `firstPage` to fetch records.');
        }

        if (isPlainObject(params)) {
            var validationResults = Query.validateParams(params);

            if (validationResults.errors.length) {
                var formattedErrors = map(validationResults.errors, function(error) {
                    return '  * ' + error;
                });

                assert(false, 'Airtable: invalid parameters for `select`:\n' +
                    formattedErrors.join('\n'));
            }

            if (validationResults.ignoredKeys.length) {
                console.warn('Airtable: the following parameters to `select` will be ignored: ' +
                    validationResults.ignoredKeys.join(', '));
            }

            return new Query(this, validationResults.validParams);
        } else {
            assert(false, 'Airtable: the parameter for `select` should be a plain object or undefined.');
        }
    },
    _urlEncodedNameOrId: function(){
        return this.id || encodeURIComponent(this.name);
    },
    _createRecord: function(recordData, optionalParameters, done) {
        var that = this;
        if (!done) {
            done = optionalParameters;
            optionalParameters = {};
        }
        var requestData = assign({fields: recordData}, optionalParameters);
        this._base.runAction('post', '/' + that._urlEncodedNameOrId() + '/', {}, requestData, function(err, resp, body) {
            if (err) { done(err); return; }

            var record = new Record(that, body.id, body);
            done(null, record);
        });
    },
    _updateRecord: function(recordId, recordData, opts, done) {
        var record = new Record(this, recordId);
        if (!done) {
            done = opts;
            record.patchUpdate(recordData, done);
        } else {
            record.patchUpdate(recordData, opts, done);
        }
    },
    _replaceRecord: function(recordId, recordData, opts, done) {
        var record = new Record(this, recordId);
        if (!done) {
            done = opts;
            record.putUpdate(recordData, done);
        } else {
            record.putUpdate(recordData, opts, done);
        }
    },
    _destroyRecord: function(recordId, done) {
        var record = new Record(this, recordId);
        record.destroy(done);
    },
    _listRecords: function(limit, offset, opts, done) {
        var that = this;

        if (!done) {
            done = opts;
            opts = {};
        }
        var listRecordsParameters = assign({
            limit: limit, offset: offset
        }, opts);

        this._base.runAction('get', '/' + this._urlEncodedNameOrId() + '/', listRecordsParameters, null, function (err, response, results) {
            if (err) {
                done(err);
                return;
            }

            var records = map(results.records, function(recordJson) {
                return new Record(that, null, recordJson);
            });
            done(null, records, results.offset);
        });
    },
    _forEachRecord: function(opts, callback, done) {
        if (arguments.length === 2) {
            done = callback;
            callback = opts;
            opts = {};
        }
        var that = this;
        var limit = Table.__recordsPerPageForIteration || 100;
        var offset = null;

        var nextPage = function() {
            that._listRecords(limit, offset, opts, function(err, page, newOffset) {
                if (err) { done(err); return; }

                forEach(page, callback);

                if (newOffset) {
                    offset = newOffset;
                    nextPage();
                } else {
                    done();
                }
            });
        };
        nextPage();
    }
});

module.exports = Table;


/**
 * Callback function for the final results or error of a query
 * @callback Table~done
 * @param {Error} error - if the query failed, error will represent the error that occured.  If the query succeeded, error will be null
 * @param {Record} result - the Record modified by the CRUD operation
 * @memberOf Table
*/