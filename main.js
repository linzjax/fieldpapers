L.PageComposer = L.Class.extend({
    includes: L.Mixin.Events,

    options: {
        pageHeight: 150,
        minHeight: 80,
        paddingToEdge: 30,
        keepAspectRatio: true,
    },

    offset: new L.Point(0,0),
    dimensions: {
        pageHeight: 100,
    },

    refs: {
      paper_aspect_ratios: {
        letter : {landscape: 1.294, portrait: 0.773, scale: 1},
        a3: {landscape: 1.414, portrait: 0.707, scale: 1.414},
        a4: {landscape: 1.414, portrait: 0.707, scale: 1}
      },
      toolScale: 1,
      zoomScale: 1,
      startZoom: null,
      paperSize: 'letter',
      pageOrientation: 'landscape',
      page_aspect_ratio:  null,
      page_dimensions: {
        width: 0,
        height: 0
      },
      rows: 1,
      cols: 2,
      prevRows: 1,
      prevCols: 2
    },

    initialize: function(options) {
        L.Util.setOptions(this, options);
        this.refs.page_aspect_ratio = this.refs.paper_aspect_ratios[this.refs.paperSize][this.refs.pageOrientation];
        this._width = (this.options.pageHeight * this.refs.page_aspect_ratio) * this.refs.cols;
        this._height = this.options.pageHeight * this.refs.rows;
    },
    
    //all the same
    addTo: function(map) {
        this.map = map;
        this.refs.startZoom = map.getZoom();
        this._createElements();
        this._render();
        return this;
    },
    
    //all the same
    getBounds: function() {
        var size = this.map.getSize();
        var topRight = new L.Point();
        var bottomLeft = new L.Point();
        
        bottomLeft.x = Math.round((size.x - this._width) / 2);
        topRight.y = Math.round((size.y - this._height) / 2);
        topRight.x = size.x - bottomLeft.x;
        bottomLeft.y = size.y - topRight.y;
        
        var sw = this.map.containerPointToLatLng(bottomLeft);
        var ne = this.map.containerPointToLatLng(topRight);
        
        return new L.LatLngBounds(sw, ne);
    },

    //never called
    _getBoundsPinToNorthWest: function() {
      var size = this.map.getSize();
      var topRight = new L.Point();
      var bottomLeft = new L.Point();

      var nwPoint = this.map.latLngToContainerPoint(this.nwLocation);

      topRight.y = nwPoint.y;
      bottomLeft.y = nwPoint.y + this.dimensions.height;
      bottomLeft.x = nwPoint.x;
      topRight.x = nwPoint.x + this.dimensions.width;

      var sw = this.map.containerPointToLatLng(bottomLeft);
      var ne = this.map.containerPointToLatLng(topRight);

      return new L.LatLngBounds(sw, ne);
    },

    _setDimensions: function() {
      this.dimensions.nw = this.map.latLngToContainerPoint(this.bounds.getNorthWest());
      this.dimensions.ne = this.map.latLngToContainerPoint(this.bounds.getNorthEast());
      this.dimensions.sw = this.map.latLngToContainerPoint(this.bounds.getSouthWest());
      this.dimensions.se = this.map.latLngToContainerPoint(this.bounds.getSouthEast());
      this.dimensions.width = this.dimensions.ne.x - this.dimensions.nw.x;
      this.dimensions.height = this.dimensions.se.y - this.dimensions.ne.y;

      this.dimensions.cellWidth = this.dimensions.width / this.refs.cols;
      this.dimensions.cellHeight = this.dimensions.height / this.refs.rows;
    },
    

    remove: function() {
        //removed "move"
        this.map.off("moveend", this._onMapChange);
        //this.map.off("zoomend", this._onMapChange);
        this.map.off("resize", this._onMapResize);

        if (this._scaleHandle) L.DomEvent.removeListener(this._scaleHandle, "mousedown", this._onScaleMouseDown);
        
        this._container.parentNode.removeChild(this._container);
    },

    _makePageElement: function(x,y,w,h) {
      var div = document.createElement('div');
      div.className = "page";
      div.style.left = x + "%";
      div.style.top = y + "%";
      div.style.height = h + "%";
      div.style.width = w + "%";
      console.log(div);
      return div;
    },

    _createPages: function() {
      var cols = this.refs.cols,
          rows = this.refs.rows,
          gridElm = this._grid,
          top = this.dimensions.nw.y,
          left = this.dimensions.nw.x,
          width = this.dimensions.width,
          height = this.dimensions.height;

      L.DomUtil.removeClass(this._container, "one-row");
      L.DomUtil.removeClass(this._container, "one-col");

      if (cols === 1) L.DomUtil.addClass(this._container, "one-col");
      if (rows === 1) L.DomUtil.addClass(this._container, "one-row");

      this._grid.innerHTML = "";
      this._grid.style.top = top + "px";
      this._grid.style.left = left + "px";
      this._grid.style.width = width + "px";
      this._grid.style.height = height + "px";

      var spacingX = 100 / cols,
          spacingY = 100 / rows;

      // cols
      for (var i = 0;i< cols;i++) {
        for (var r = 0;r< rows;r++) {
          var elm = gridElm.appendChild( this._makePageElement(spacingX * i, spacingY * r, spacingX, spacingY ) );

          // adjust borders
          if (r === 0) {
            L.DomUtil.addClass(elm, 'outer-top');
          } else {
            L.DomUtil.addClass(elm, 'no-top');
          }

          if(r == rows-1) {
            L.DomUtil.addClass(elm, 'outer-bottom');
          }

          if (i === 0) {
            L.DomUtil.addClass(elm, 'outer-left');
          } else {
            L.DomUtil.addClass(elm, 'no-left');
          }
          if (i == cols-1) {
            L.DomUtil.addClass(elm, 'outer-right');
          }
        }
      }
    },

    _onAddRow: function(evt) {
      evt.stopPropagation();
      this.refs.rows++;
      this._updatePages();
    },

    _onSubtractRow: function(evt) {
      evt.stopPropagation();
      if (this.refs.rows === 1) return;
      this.refs.rows--;
      this._updatePages();
    },

    _onAddCol: function(evt) {
      evt.stopPropagation();
      this.refs.cols++;
      this._updatePages();
    },

    _onSubtractCol: function(evt) {
      evt.stopPropagation();
      if (this.refs.cols === 1) return;
      this.refs.cols--;
      this._updatePages();
    },

    _updatePages: function() {
      this._setDimensions();
      this._updateToolDimensions();
      this._createPages();

      this.fire("change");
    },

    _updateToolDimensions: function() {
      if (this.refs.cols !== this.refs.prevCols) {
        var width = this.dimensions.width / this.refs.prevCols;
        this.dimensions.width = width * this.refs.cols;
        this.refs.prevCols = this.refs.cols;
      }

      if (this.refs.rows !== this.refs.prevRows) {
        var height = this.dimensions.height / this.refs.prevRows;
        this.dimensions.height = height * this.refs.rows;
        this.refs.prevRows = this.refs.rows;
      }

      // re-calc bounds
      this.bounds = this._getBoundsPinToNorthWest();
      this._render();
    },

    //adds +/-
    _createPageModifiers: function() {
      // row
      this._rowModifier = L.DomUtil.create("div", "leaflet-areaselect-handle page-tool row-modifier", this._container);
      this._addRow = L.DomUtil.create("div", "modifier-btn add-btn", this._rowModifier);
      //this._addRow.innerHTML = "+";
      this._createInnerText(this._addRow, "+");
      this._minusRow = L.DomUtil.create("div", "modifier-btn subtract-btn", this._rowModifier);
      //this._minusRow.innerHTML = "&#8722;";
      this._createInnerText(this._minusRow, "&#8722;");

      // col
      this._colModifier = L.DomUtil.create("div", "leaflet-areaselect-handle page-tool col-modifier", this._container);
      this._addCol = L.DomUtil.create("div", "modifier-btn add-btn", this._colModifier);
      //this._addCol.innerHTML = "+";
      this._createInnerText(this._addCol, "+");
      this._minusCol = L.DomUtil.create("div", "modifier-btn subtract-btn", this._colModifier);
      //this._minusCol.innerHTML = "&#8722;";
      this._createInnerText(this._minusCol, "&#8722;");

      var gridModifiers = document.getElementsByClassName("math");
      //console.log(thing[0]);

      L.DomEvent.addListener(gridModifiers[2], "click", this._onAddRow, this);
      L.DomEvent.addListener(gridModifiers[0], "click", this._onSubtractRow, this);
      L.DomEvent.addListener(gridModifiers[5], "click", this._onAddCol, this);
      L.DomEvent.addListener(gridModifiers[3], "click", this._onSubtractCol, this);
    },

    _createInnerText: function(container, text) {
      var c = L.DomUtil.create("div", "", container);
      c.innerHTML = text;
    },
    
    _createElements: function() {
        if (!!this._container)
          return;

        // base elements
        this._container =   L.DomUtil.create("div", "leaflet-areaselect-container", this.map._controlContainer);
        this._grid =        L.DomUtil.create("div", "leaflet-areaselect-grid", this._container);

        // shade layers
        this._topShade =    L.DomUtil.create("div", "leaflet-areaselect-shade", this._container);
        this._bottomShade = L.DomUtil.create("div", "leaflet-areaselect-shade", this._container);
        this._leftShade =   L.DomUtil.create("div", "leaflet-areaselect-shade", this._container);
        this._rightShade =  L.DomUtil.create("div", "leaflet-areaselect-shade", this._container);

        // add/remove page btns
        this._createPageModifiers();

        // add scale & drag btns
        this._createContainerModifiers();

        //
        this._calculateInitialPositions();
        this._setDimensions();
        this._createPages();

        //this.map.on("move",     this._onMapMovement, this);
        this.map.on("moveend",  this._onMapMovement, this);
        this.map.on("viewreset",  this._onMapReset, this);
        this.map.on("resize",   this._onMapReset, this);

        this.fire("change");
    },

    // Adds the scale & drag buttons
    _createContainerModifiers: function() {
      // scale button
      this._setScaleHandler(L.DomUtil.create("div", "leaflet-areaselect-handle scale-handle", this._container), -1, -1);

      // drag button
      // if (typeof L.DraggableAny === 'function') {
      //   this._dragHandle = L.DomUtil.create("div", "leaflet-areaselect-handle drag-handle", this._container);
      //   var draggable = new L.DraggableAny(this._dragHandle, null, this._getPos, this._setPos, this);
      //   draggable.enable();
      // }
    },

    _onMapMovement: function(){
        this._updateNWPosition(this.dimensions.nw);
    },

    _updateNWPosition: function(pos) {
      this.nwPosition = pos;
      this.nwLocation = this.map.containerPointToLatLng(pos);
      this.bounds = this._getBoundsPinToNorthWest();
    },

    _onMapReset: function() {
      this.refs.zoomScale = 1 / this.map.getZoomScale(this.refs.startZoom);
      //this._render();
      this.fire("change");
    },

    // Handler for when the tool is scaled
    _setScaleHandler: function(handle, xMod, yMod) {
      if (this._scaleHandle) return;
      xMod = xMod || 1;
      yMod = yMod || 1;

      this._scaleHandle = handle;

      this._scaleProps = {
        x: xMod,
        y: yMod,
        curX: 0,
        curY: 0,
        maxHeight: 0,
        ratio: 1
      };

      L.DomEvent.addListener(this._scaleHandle, "mousedown", this._onScaleMouseDown, this);
    },

    _onScaleMouseMove: function(event) {
      var width = this.dimensions.width,
          height = this.dimensions.height;

      if (this.options.keepAspectRatio) {
        //var maxHeight = (height >= width ? size.y : size.y * (1/ratio) ) - 30;
        height += (this._scaleProps.curY - event.originalEvent.pageY) * 2 * this._scaleProps.y;
        height = Math.max(this.options.minHeight, height);
        height = Math.min(this._scaleProps.maxHeight, height);
        width = height * this._scaleProps.ratio;

      } else {
        this._width += (this._scaleProps.curX - event.originalEvent.pageX) * 2 * this._scaleProps.x;
        this._height += (this._scaleProps.curY - event.originalEvent.pageY) * 2 * this._scaleProps.y;
        this._width = Math.max(this.options.paddingToEdge, this._width);
        this._height = Math.max(this.options.paddingToEdge, this._height);
        this._width = Math.min(size.x-this.options.paddingToEdge, this._width);
        this._height = Math.min(size.y-this.options.paddingToEdge, this._height);
      }

      this.dimensions.width = width;
      this.dimensions.height = height;

      this._scaleProps.curX = event.originalEvent.pageX;
      this._scaleProps.curY = event.originalEvent.pageY;

      this.bounds = this._getBoundsPinToNorthWest();
      this._setDimensions();
      this._render();
    },

    _onScaleMouseDown: function(event) {
      //event.stopPropagation();
      L.DomEvent.stopPropagation(event);
      L.DomEvent.removeListener(this._scaleHandle, "mousedown", this._onScaleMouseDown);

      this._scaleProps.curX = event.pageX;
      this._scaleProps.curY = event.pageY;
      this._scaleProps.ratio = this.dimensions.width / this.dimensions.height;
      var size = this.map.getSize();
      L.DomUtil.disableTextSelection();
      L.DomUtil.addClass(this._container, 'scaling');

      var nwPt = this.map.latLngToContainerPoint(this.bounds.getNorthWest());
      var maxHeightY = size.y - this.map.latLngToContainerPoint(this.bounds.getNorthWest()).y - this.options.paddingToEdge;
      var maxHeightX = (size.x - this.map.latLngToContainerPoint(this.bounds.getNorthWest()).x - this.options.paddingToEdge) * 1/this._scaleProps.ratio;
      this._scaleProps.maxHeight = Math.min(maxHeightY, maxHeightX);

      L.DomEvent.addListener(this.map, "mousemove", this._onScaleMouseMove, this);
      L.DomEvent.addListener(this.map, "mouseup", this._onScaleMouseUp, this);
    },

    _onScaleMouseUp: function(event) {
      L.DomEvent.removeListener(this.map, "mouseup", this._onScaleMouseUp);
      L.DomEvent.removeListener(this.map, "mousemove", this._onScaleMouseMove);
      L.DomEvent.addListener(this._scaleHandle, "mousedown", this._onScaleMouseDown, this);
      L.DomUtil.enableTextSelection();
      L.DomUtil.removeClass(this._container, 'scaling');
      this.fire("change");
    },
    
    _setUpHandlerEvents: function(handle, xMod, yMod) {
        xMod = xMod || 1;
        yMod = yMod || 1;
        
        var self = this;
        function onMouseDown(event) {
            event.stopPropagation();
            L.DomEvent.removeListener(this, "mousedown", onMouseDown);
            var curX = event.pageX;
            var curY = event.pageY;
            var ratio = self._width / self._height;
            var size = self.map.getSize();
            
            function onMouseMove(event) {
                if (self.options.keepAspectRatio) {
                    var maxHeight = (self._height >= self._width ? size.y : size.y * (1/ratio) ) - 30;
                    self._height += (curY - event.originalEvent.pageY) * 2 * yMod;
                    self._height = Math.max(30, self._height);
                    self._height = Math.min(maxHeight, self._height);
                    self._width = self._height * ratio;
                } else {
                    self._width += (curX - event.originalEvent.pageX) * 2 * xMod;
                    self._height += (curY - event.originalEvent.pageY) * 2 * yMod;
                    self._width = Math.max(30, self._width);
                    self._height = Math.max(30, self._height);
                    self._width = Math.min(size.x-30, self._width);
                    self._height = Math.min(size.y-30, self._height);
                    
                }
                
                curX = event.originalEvent.pageX;
                curY = event.originalEvent.pageY;
                self._render();
            }
            function onMouseUp(event) {
                L.DomEvent.removeListener(self.map, "mouseup", onMouseUp);
                L.DomEvent.removeListener(self.map, "mousemove", onMouseMove);
                L.DomEvent.addListener(handle, "mousedown", onMouseDown);
                self.fire("change");
            }
            
            L.DomEvent.addListener(self.map, "mousemove", onMouseMove);
            L.DomEvent.addListener(self.map, "mouseup", onMouseUp);
        }
        L.DomEvent.addListener(handle, "mousedown", onMouseDown);
    },
    
    _onMapResize: function() {
        //this._render();
    },
    
    _onMapChange: function() {
        this.fire("change");
    },

    _calculateInitialPositions: function() {
      var size = this.map.getSize();

      var topBottomHeight = Math.round((size.y-this._height)/2);
      var leftRightWidth = Math.round((size.x-this._width)/2);
      this.nwPosition = new L.Point(leftRightWidth + this.offset.x, topBottomHeight + this.offset.y);
      this.nwLocation = this.map.containerPointToLatLng(this.nwPosition);
      this.bounds = this.getBounds();
    },

    _updatePageGridPosition: function(left, top, width, height) {
      this._grid.style.top = top + "px";
      this._grid.style.left = left + "px";
      this._grid.style.width = width + "px";
      this._grid.style.height = height + "px";
    },

    _updateGridElement: function(element, dimension) {
        element.style.width = dimension.width + "px";
        element.style.height = dimension.height + "px";
        element.style.top = dimension.top + "px";
        element.style.left = dimension.left + "px";
        element.style.bottom = dimension.bottom + "px";
        element.style.right = dimension.right + "px";
    },
    
    _render: function() {

        var size = this.map.getSize();

        if (!this.nwPosition) {
            this._calculateInitialPositions();
        }

        this._setDimensions();

        var nw = this.dimensions.nw,
          ne = this.dimensions.ne,
          sw = this.dimensions.sw,
          se = this.dimensions.se,
          width = this.dimensions.width,
          height = this.dimensions.height,
          rightWidth = size.x - width - nw.x,
          bottomHeight = size.y - height - nw.y;

        this._updatePageGridPosition(nw.x, nw.y, width, height);

      // position shades
      this._updateGridElement(this._topShade, {
        width:size.x,
        height:nw.y > 0 ? nw.y : 0,
        top:0,
        left:0
      });

      this._updateGridElement(this._bottomShade, {
        width:size.x,
        height: bottomHeight > 0 ? bottomHeight : 0,
        bottom:0,
        left:0
      });

      this._updateGridElement(this._leftShade, {
          width: nw.x > 0 ? nw.x : 0,
          height: height,
          top: nw.y,
          left: 0
      });

      this._updateGridElement(this._rightShade, {
          width: rightWidth > 0 ? rightWidth : 0,
          height: height,
          top: nw.y,
          right: 0
      });

      // position handles
      // this._updateGridElement(this._dragHandle, {left:nw.x, top:nw.y });
      this._updateGridElement(this._scaleHandle, {left:nw.x + width, top:nw.y + height});

      // this._updateGridElement(this._rowModifier, {left:nw.x + (width / 2), top:nw.y + height});
      // this._updateGridElement(this._colModifier, {left:nw.x + width, top:nw.y + (height/2)});
        
        
    },


});


var map = L.map('map', {
    center: [40.712216, -74.22655],
    zoom: 18,
    scrollWheelZoom: false
});

L.pageComposer = function(options) {
    return new L.PageComposer(options);
};

L.pageComposer().addTo(map);


//

L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token={accessToken}', {
    attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="http://mapbox.com">Mapbox</a>',
    maxZoom: 18,
    id: 'mapbox.streets',
    accessToken: 'pk.eyJ1IjoibGluempheCIsImEiOiJjaWh6Y2hnZGIwNDkzdGxtMXJvMHVidzByIn0.Q1vAOjJ2H2pmJsxap7c2bQ'
    }).addTo(map);

// var bounds = areaSelect.getBounds();

// areaSelect.on("change", function(){
//     console.log("Bounds:", this.getBounds());
// });






