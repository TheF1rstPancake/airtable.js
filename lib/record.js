'use strict';

var assign = require('lodash/assign');

var Class = require('./class');
var callbackToPromise = require('./callback_to_promise');


/**
 * @class Record
 * @description Represents a single record from an Airtable table
 * @param {Table} table - the {@link Table} that this record belongs to
 * @param {String} recordId - the unique ID for this record
 * @param {Object} recordJson - a JSON object representing the data that this record holds
 */
var Record = Class.extend({
    init: function(table, recordId, recordJson) {
        this._table = table;
        this.id = recordId || recordJson.id;
        this.setRawJson(recordJson);

        // Public API
        /**
         * @function save
         * @memberOf Record
         * @description performs the same action as {@link putUpdate}
         */
        this.save = callbackToPromise(this.save, this);

        /**
         * @function patchUpdate
         * @memberOf Record
         * @description issue a PATCH operation to update only a certain subset of fields.  Any fields not included in the PATCH are not modified.
         * @param {Record~done} done - callback that ifres once the operation is complete
         * @returns {null|Promise<Record>} executes the callback if present; returns a Promise with the updated {@link Record} otherwise

         */
        this.patchUpdate = callbackToPromise(this.patchUpdate, this);

        /**
         * @function putUpdate
         * @memberOf Record
         * @description issue a PUT operation to update all fields.  Any fields not included in the PUT will have their value cleared (i.e. set to null) within Airtable.
         * @param {Record~done} done - callback that ifres once the operation is complete
         * @returns {null|Promise<Record>} - executes the callback if present; returns a Promise with the updated {@link Record} otherwise

         */
        this.putUpdate = callbackToPromise(this.putUpdate, this);

        /**
         * @function destroy
         * @memberOf Record
         * @description issue a DELETE operation to delete the record
         * @param {Record~done} done - callback that ifres once the operation is complete
         * @returns {null|Promise<Record>} executes the callback if present; returns a Promise with the updated {@link Record} otherwise

         */
        this.destroy = callbackToPromise(this.destroy, this);

        /**
         * @function fetch
         * @memberOf Record
         * @description issue a GET operation to fetch this specific record
         * @param {Record~done} done - callback that ifres once the operation is complete
         * @returns {null|Promise<Record>} executes the callback if present; returns a Promise with the updated {@link Record} otherwise

         */
        this.fetch = callbackToPromise(this.fetch, this);

        /**
         * @function updateFields
         * @memberOf Record
         * @description perfoms the same operation as {@link patchUpdate}
         */
        this.updateFields = this.patchUpdate;

        /**
         * @function replaceFields
         * @memberOf Record
         * @description performs the same operation as {@link putUpdate}
         */
        this.replaceFields = this.putUpdate;
    },
    getId: function() {
        return this.id;
    },
    get: function(columnName) {
        return this.fields[columnName];
    },
    set: function(columnName, columnValue) {
        this.fields[columnName] = columnValue;
    },
    save: function(done) {
        this.putUpdate(this.fields, done);
    },
    patchUpdate: function(cellValuesByName, opts, done) {
        var that = this;
        if (!done) {
            done = opts;
            opts = {};
        }
        var updateBody = assign({
            fields: cellValuesByName
        }, opts);

        this._table._base.runAction('patch', '/' + this._table._urlEncodedNameOrId() + '/' + this.id, {}, updateBody, function(err, response, results) {
            if (err) { done(err); return; }

            that.setRawJson(results);
            done(null, that);
        });
    },
    putUpdate: function(cellValuesByName, opts, done) {
        var that = this;
        if (!done) {
            done = opts;
            opts = {};
        }
        var updateBody = assign({
            fields: cellValuesByName
        }, opts);
        this._table._base.runAction('put', '/' + this._table._urlEncodedNameOrId() + '/' + this.id, {}, updateBody, function(err, response, results) {
            if (err) { done(err); return; }

            that.setRawJson(results);
            done(null, that);
        });
    },
    destroy: function(done) {
        var that = this;
        this._table._base.runAction('delete', '/' + this._table._urlEncodedNameOrId() + '/' + this.id, {}, null, function(err, response, results) {
            if (err) { done(err); return; }

            done(null, that);
        });
    },

    fetch: function(done) {
        var that = this;
        this._table._base.runAction('get', '/' + this._table._urlEncodedNameOrId() + '/' + this.id, {}, null, function(err, response, results) {
            if (err) { done(err); return; }

            that.setRawJson(results);
            done(null, that);
        });
    },
    setRawJson: function(rawJson) {
        this._rawJson = rawJson;
        this.fields = (this._rawJson && this._rawJson.fields) || {};
    }
});

module.exports = Record;

/**
 * Callback function for the final results or error of a query
 * @callback Record~done
 * @param {Error} error - if the query failed, error will represent the error that occured.  If the query succeeded, error will be null
 * @param {Record} results - the record that you just performed an operation on
 * @memberOf Query
*/

/**
 * @name Record#fields
 * @memberOf Record
 * @type {Object}
 * @description after creating a new Record, this is an associative array representing of the record's non-null fields.
 */

 /**
  * @name Record#id
  * @memberOf Record
  * @type {String}
  * @description the unique ID for the record
  */