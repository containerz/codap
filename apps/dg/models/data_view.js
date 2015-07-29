// ==========================================================================
//  
//  Author:   jsandoe
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
 * Manages a hierarchical view of a data set.
 * @extends SC.Object
 */
/*global: sc_super */
DG.DataView = SC.Object.extend((function() // closure

/** @scope DG.DataView.prototype */ {

  var AttributeGroup = SC.Object.extend((function() {
    return {
      /**
       * @param {number} attrIndex Attribute groups are delineated by the
       * beginning attribute in the DataView's attribute list.
       */
      attrIndex: null,

      /**
       * The data view owning this group.
       *
       * @param {DG.DataView}
       */
      dataView: null,

      /**
       * Returns a list of attributes in this group.
       */
      attributes: function () {
        var dataView = this.dataView;
        var myIndex = dataView._groupIndex(this);
        var nextGroup = dataView.groups[myIndex+1];
        var nextGroupAttrIndex = nextGroup?nextGroup.attrIndex:dataView.attrs.length;
        var attributes = [];
        var ix;
        for (ix = this.attrIndex; ix < nextGroupAttrIndex; ix += 1) {
          attributes.push(dataView.attrs[ix]);
        }
        return attributes;
      }
    };
  })());

  return {  // return from closure
    dataSet: null,

    attrs: null,

    groups: null,

    sortedList: null,

    init: function () {
      if (!this.attrs) { this.attrs = []; }
      if (!this.groups) { this.groups = []; }
    },

    /**
     * Adds one or more attributes at a given position, or after the last
     * attribute, if no position is specified.
     * @param {[DG.Attribute]} newAttrs
     * @param {Number} position non-negative index
     */
    insertAttributes: function(newAttrs, position) {
      var count;

      if (!Array.isArray(newAttrs)) {
        newAttrs = [newAttrs];
      }

      count = newAttrs.length;

      if (position < 0 || position > this.attrs.length) {
        DG.logWarn('Adding attribute to view at illegal position: ' + position);
        return;
      }

      if (SC.none(position)) {
        position = newAttrs.length;
      }

      if (this.groups.length === 0) {
        //noinspection JSCheckFunctionSignatures
        this.createAttributeGroup();
      }

      this.attrs = this.attrs.slice(0, position)
        .concat(newAttrs, this.attrs.slice(position));

      this.groups.forEach(function (group) {
        if (group.attrIndex > position) {
          group.attrIndex += count;
        }
      });

    },

    _groupIndex: function (group) {
      return this.groups.indexOf(group);
    },

    /**
     * Creates a new attribute group.
     *
     * If parentGroup is specified, inserts the new group as a child of this
     * group, and makes the parentGroup's current child its child. If not
     * specified, creates new group as the lead group.
     *
     * @param {DG.Group|undefined} parentGroup
     * @return {DG.Group} newGroup
     */
    createAttributeGroup: function (parentGroup) {
      var attrIndex = 0;
      var parentGroupIndex = 0;
      var newGroup;

      if (!SC.none(parentGroup)) {
        attrIndex = parentGroup.attrIndex + parent.attributes().length;
        parentGroupIndex = this._groupIndex(parentGroup);
      }
      newGroup = AttributeGroup.create({attrIndex: attrIndex, dataView: this});
      this.groups.splice(parentGroupIndex, 0, newGroup);
      return newGroup;
    },

    /**
     * Moves an attribute some number of positions. If a negative integer moves to
     * the left, if a positive number, moves to the right.
     */
    moveAttribute: function (attr, positions) {}

  };
})());