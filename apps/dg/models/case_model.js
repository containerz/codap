// ==========================================================================
//                                DG.Case
//
//  Copyright (c) 2014 by The Concord Consortium, Inc. All rights reserved.
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

sc_require('models/model_store');
sc_require('models/base_model');

/** @class
 *
 * Represents an individual case in the collection. For the base collection (the
 * rightmost collection, the one with no child collection) there is one case
 * for each item in the data set. For all upper level collections a case is a unique
 * combination of attribute values among the data items with the same parentage.
 * Each collection manages an attribute group. An individual case is the set of
 * DataItems in the DataSet for which the attributes in the attribute group all
 * have the same values.
 *
 * @extends SC.Object
 */
DG.Case = DG.BaseModel.extend((function() {
  /** @scope DG.Case.prototype */

  /**
    Default formatting for Date objects.
    Uses toLocaleDateString() for default date formatting.
    Optionally uses toLocaleTimeString() for default time formatting.
   */
  function formatDate(x) {
    if (!(x && DG.isDate(x))) return "";
    // use a JS Date object for formatting, since our valueOf()
    // change seems to affect string formatting
    var date = new Date(Number(x) * 1000),
        h = date.getHours(),
        m = date.getMinutes(),
        s = date.getSeconds(),
        ms = date.getMilliseconds(),
        hasTime = (h + m + s + ms) > 0,
        dateStr = date.toLocaleDateString(),
        timeStr = hasTime ? " " + date.toLocaleTimeString() : "";
    return dateStr + timeStr;
  }

  /**
    Utility function to convert dates to strings while leaving
    all other values alone.
   */
  function convertValue(x) {
    return DG.isDate(x) ? formatDate(x) : x;
  }

  return {

    /**
     * Revision counter for the case.
     *  Incrementing the revision property causes change notifications to be sent.
     *  Calling beginCaseValueChanges()/endCaseValueChanges() will automatically
     *  increment the revision counter when endCaseValueChanges() is called.
     * @property {Number}
     */
    revision: 0,

    /**
     * A relational link back to the parent collection.
     * @property {DG.Collection}
     */
    collection: null,

    /**
     * A relational link back to the parent case (if any).
     * @property {DG.Case}
     */
    parent: null,

    /**
     * A relational link to the child cases of this case.
     * @property {[DG.Case]}
     */
    children: null,

      /**
       * Every case gets its attribute values from an item.
       * @type {DG.DataItem}
       */
    item: null,

    /**
     * Associative array of {AttrID:value} pairs for quicker lookups.
     */
    _valuesMap: function () {
      return this.get('item').values;
    }.property(),

    /**
     * An object whose properties represent the values of the case.
     *
     * Only used to persist the object as JSON.
     * @property {Object}
     */
    values: null,

    /**
     * Initialization function for the case.
     */
    init: function() {
      sc_super();

      DG.Case._addCaseToItemMap(this);

      this.children = [];
      if (this.parent) {
        this.parent.children.pushObject(this);
      }
    },

    verify: function () {
      if (SC.empty(this.collection)) {
        DG.logWarn('Unattached case: ' + this.id);
      }
      if (typeof this.collection === 'number') {
        DG.logWarn('Unresolved reference to collection id, ' + this.collection +
          ', in case: ' + this.id);
      }
      if (typeof this.get('parent') === 'number') {
        DG.logWarn('Unresolved reference to parent, ' + this.get('parent') +
          ', in case: ' + this.id);
      }
    },

    /**
     * Destruction function for the case.
     */
    destroy: function() {
      if (this.parent) {
        this.parent.children.removeObject(this);
      }
      if (this.collection) {
        this.collection.cases.removeObject(this);
      }

      DG.Case._removeCaseFromItemMap(this);

      sc_super();
    },

    beginCaseValueChanges: function() {
      this.beginPropertyChanges();
    },

    /**
     * Ends a set of property changes and increments the revision property.
     */
    endCaseValueChanges: function() {
      this.incrementProperty('revision');
      this.endPropertyChanges();
    },

    /**
     * Returns the raw value of the specified attribute for this case.
     * Dates are returned as Dates rather than converted to strings.
     * @param {Number} iAttrID ID of the attribute for which the value should be returned.
     * @returns {Number | String | null}
     */
    getRawValue: function( iAttrID) {

      if( !SC.none( iAttrID)) {

        // If we have an attribute formula, we must evaluate it.
        var tAttr = DG.Attribute.getAttributeByID( iAttrID);
        var valuesMap = this.get('_valuesMap');
        if (tAttr && tAttr.get('hasFormula') &&
          // we only do the evaluation if it's one of this case's attributes
          (this.getPath('collection.id') === tAttr.getPath('collection.id'))) {
          return tAttr.evalFormula( this);
        }

        // If we have a cached value, simply return it

        if( tAttr && valuesMap && (!SC.none(valuesMap[iAttrID])) &&
              // we only do the evaluation if it's one of this case's attributes
            (this.getPath('collection.id') === tAttr.getPath('collection.id'))) {
          return valuesMap[iAttrID];
        }

        // one last chance if we've got a parent and it has 'getValue'
        // Need for this seems to have been brought about by a particular import of boundary file data. Can't hurt.
        var tParent = this.get('parent');
        if( tParent /*&& tParent.getValue*/)
          return tParent.getValue( iAttrID);
      }
      // if we get here, return value is undefined
    },

    /**
     * Returns the value of the specified attribute for this case.
     * Dates are converted to strings.
     * @param {Number} iAttrID ID of the attribute for which the value should be returned.
     * @returns {Number | String | null}
     */
    getValue: function( iAttrID) {
      var rawValue = this.getRawValue(iAttrID);
      return rawValue != null ? convertValue(rawValue) : rawValue;
    },

    /**
     * Returns the numeric value of the specified attribute for this case.
     * Note that the built-in isFinite() can be used with the result (rather than
     * DG.isFinite()) because nulls/undefineds/etc. have already been filtered out.
     * @param {Number} iAttrID -- ID of the attribute for which the value should be returned.
     * @param {Object} oOptInfo -- Additional information about the value can be returned to
     *                              the client via this object.
     *                  .type -- The type of the value, e.g. "string", "number", etc.
     *                  .isNominal -- True if the value is non-numeric and can be
     *                                converted to a non-empty string.
     * @returns {Number}
     */
    getNumValue: function( iAttrID, oOptInfo) {
      var value = this.getRawValue( iAttrID),
          valType = typeof value;
      if (DG.isDate(value)) {
        // treat dates numerically
        value = Number(value);
        valType = "number";
      }
      if( oOptInfo) {
        oOptInfo.type = valType;
        // Note: we don't consider non-primitive types (e.g. objects, arrays, etc.)
        oOptInfo.isNominal = (valType === "boolean") ||
          ((valType === "string") && !SC.empty(String(value)));
      }
      switch( valType) {
        case "number":
          return value;
        case "string":
          return (value !== "" ? Number(value) : NaN);
      }
      return NaN;
    },

    /**
     * Returns the string value of the specified attribute for this case.
     * @param {Number} iAttrID ID of the attribute for which the value should be returned.
     * @param {Object} oOptInfo -- Additional information about the value can be returned to
     *                              the client via this object.
     *                  .type -- The type of the value, e.g. "string", "number", etc.
     * @returns {String}
     */
    getStrValue: function( iAttrID, oOptInfo) {
      var value = this.getValue( iAttrID),
          valType = typeof value;
      if (DG.isDate(value)) {
        // treat dates as strings
        value = convertValue(value);
        valType = "string";
      }
      if( oOptInfo) {
        oOptInfo.type = valType;
      }
      switch( valType) {
        case "number":
        case "string":
        case "boolean":
          return String( value);
      }
      return "";
    },

    /**
     * Is there a value of the specified attribute for this case.
     * Note that a formula can return a null value, so some cases will be thought
     * to have a value for the given attribute ID, when actually they don't.
     * @param {Number} iAttrID ID of the attribute for which the value should be returned.
     * @returns {Boolean}
     */
    hasValue: function( iAttrID) {
      if (!SC.none( iAttrID)) {
        var tAttr = this.get('collection').getAttributeByID( iAttrID);
        if(tAttr && tAttr.get('hasFormula'))
          return !SC.empty( this.getValue( iAttrID));

        if( tAttr)
          return this.get('_valuesMap') && !SC.empty( this.get('_valuesMap')[iAttrID]);

        var tParent = this.get('parent');
        return tParent && tParent.hasValue( iAttrID);
      }
    },

    /**
     * Sets the value of the specified attribute for this case.
     * @param {Number} iAttrID ID of the attribute for which the value should be set.
     * @param {String} iValue Value of the newly created case value.
     */
    setValue: function(iAttrID, iValue) {
      var children = this.get('children');
      if( !this.get('_valuesMap')) return; // Looks like case has been destroyed

      if (children.length === 0) {
        this.item.setValue(iAttrID, iValue);
      } else {
        children.forEach(function (child) { child.setValue(iAttrID, iValue); });
      }
    },

    /**
     Override to handle 'values' specially.
     During runtime, the _valuesMap, which maps from attrID to value,
     is the definitive contents of the case. In this method, we copy
     the contents of the _valuesMap to the 'values' property, which
     maps from attrName to value, for archival purposes.
     */
    genArchive: function() {
      var values = {};
      var valuesMap = this.get('_valuesMap');
      var attrs = this.collection.attrs;
      attrs.forEach(function (attr, ix) {
        values[attr.name] = valuesMap[attr.id];
      });
      // Note that in the absence of a doPostArchive() method, we don't
      // have an opportunity to clear the 'values' between saves.
      this.set('values', values);
    },


    debugLog: function(iPrompt) {
      DG.log('Case ' + this.get('id'));
    },

    toArchive: function () {
      var result;
      this.genArchive();
      result = {
        parent: (this.get('parent') && this.get('parent').id)  || undefined,
        guid: this.id,
        values: this.values
      };
      this.values = null;
      return result;
    }
  };
})());

/*
  Map from { collectionID: { itemID: DG.Case }}
  Used for looking up cases from items.
 */
DG.Case._itemCaseMaps = {};

/*
  Adds a (new) case to the item case map.
 */
DG.Case._addCaseToItemMap = function(iCase) {
  var collectionID = iCase.getPath('collection.id'),
      itemID = iCase.getPath('item.id'),
      itemCaseMap = collectionID && DG.Case._itemCaseMaps[collectionID];
  if (itemID && collectionID) {
    if (!itemCaseMap)
      DG.Case._itemCaseMaps[collectionID] = itemCaseMap = {};
    itemCaseMap[itemID] = iCase;
  }
};

/*
  Removes a case from the item case map.
 */
DG.Case._removeCaseFromItemMap = function(iCase) {
  var collectionID = iCase.getPath('collection.id'),
      itemID = iCase.getPath('item.id'),
      itemCaseMap = collectionID && DG.Case._itemCaseMaps[collectionID];
  if (itemID && itemCaseMap) {
    delete itemCaseMap[itemID];
    if (!DG.ObjectMap.length(itemCaseMap))
      delete DG.Case._itemCaseMaps[collectionID];
  }
};

/*
  Find a case (if any) that corresponds to the specified item.
 */
DG.Case.findCase = function(iCollectionID, iItemID) {
  var itemCaseMap = iCollectionID && DG.Case._itemCaseMaps[iCollectionID];
  return itemCaseMap && iItemID && itemCaseMap[iItemID];
};

/**
 * Creates a new case with the specified properties.
 * @param iProperties
 *    {{collection:DG.Collection|id, parent:DG.Case|id, extentStart: number}}
 *    Properties to apply to the newly-created DG.Case
 *
 * @return {DG.Case}  The newly-created DG.Case
 */
DG.Case.createCase = function( iProperties) {
  var collection = iProperties.collection,
    parent = iProperties.parent,
    newCase;
  iProperties.collection = DG.store.resolve(collection);
  if (!SC.empty(parent)) {
    iProperties.parent = DG.store.resolve(parent);
  }
  newCase = DG.Case.create(iProperties || {});
  return newCase;
};

/**
 * Destroys the specified DG.Case.
 * @param {DG.Case} iCase The case to destroy
 */
DG.Case.destroyCase = function( iCase) {
  iCase.destroy();
};
