// ==========================================================================
//  Author:   Jonathan Sandoe
//
//  Copyright (c) 2015 by The Concord Consortium, Inc. All rights reserved.
//
//  Licensed under the Apache License, Version 2.0 (the "License");
//  you may not use this file except in compliance with the License.
//  You may obtain a copy of the License at
//
//    http://www.apache.org/licenses/LICENSE-2.0
//
//  Unless required by applicable law or agreed to in writing, software
//  distributed under the License is distributed on an "AS IS" BASIS,
//  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//  See the License for the specific language governing permissions and
//  limitations under the License.
// ==========================================================================

/** @class
 *
 * An indexed collection of Attribute values.
 *
 * Values can be retrieved or modified by row index and Attribute id.
 * Rows may be added, deleted, or undeleted.
 * Actual removal of deleted rows is deferred until a clean operation is
 * executed.
 * Indices, once assigned to a row, are not reused.
 */

DG.DataSet = SC.Object.extend((function() // closure
  /** @scope DG.DataSet.prototype */ {
  var rows = [];

  return {
    /**
     * Retrieves or sets an attribute value for a row.
     *
     * @param {integer} rowIndex a non-negative integer
     * @param {integer} attributeID a non-negative integer
     * @param {string|number} value a legal attribute value
     * @return {string|number} a legal attribute value
     */
    value: function(rowIndex, attributeID, value) {
      var row, ret;
      if (rowIndex >= 0 && rowIndex < rows.length) {
        row = rows[rowIndex];
        if (row && !row.deleted) {
          if (value) {
            row[attributeID] = value;
          }
          ret = row[attributeID];
        }
      }
      return ret;
    },

    /**
     * Retrieves an existing row.
     */
    row: function (rowIndex) {
      var row;
      if (rowIndex >= 0 && rowIndex < rows.length) {
        row = rows[rowIndex];
        if (!row.deleted) {
          return row;
        }
      }
    },

    /**
     * Adds a row.
     * @param {[*]} row  An array of values indexed by attribute ids.
     * @return {number} index.
     */
    addRow: function (row) {
      return rows.push(row) - 1;
    },

    /**
     * Marks a row for deletion.
     * @param rowIndex
     * @return {[*]} the deleted row.
     */
    deleteRow: function (rowIndex) {
      var row = this.row(rowIndex);
      if (row) {
        row.deleted = true;
      }
      return row;
    },

    /**
     * Undeletes a row if clean has not been called since the row was deleted.
     * @param rowIndex
     * @return {[*]|undefined} the restored row.
     */
    undeleteRow: function (rowIndex) {
      var row;
      if (rowIndex >= 0 && rowIndex < rows.length) {
        row = rows[rowIndex];
        row.deleted = false;
      }
      return row;
    },

    /**
     * Permanently removes deleted rows and reclaims space.
     * @return {number} Count of rows retrieved.
     */
    clean: function () {
      rows.forEach(function(row, ix) {
        if (row.deleted) {
          delete rows[ix];
        }
      });
    }

  };
})());