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
        this.refs.page_aspect_ratio = this.refs.paper_aspect_ratios['letter']['portrait'];
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
        this.map.off("zoomend", this._onMapChange);
        this.map.off("resize", this._onMapResize);
        
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
        //this._createPageModifiers();

        // add scale & drag btns
        //this._createContainerModifiers();

        //
        this._calculateInitialPositions();
        this._setDimensions();
        this._createPages();

        //this.map.on("move",     this._onMapMovement, this);
        //this.map.on("moveend",  this._onMapMovement, this);
        this.map.on("viewreset",  this._onMapReset, this);
        this.map.on("resize",   this._onMapReset, this);

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
        this._render();
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
      // this._updateGridElement(this._scaleHandle, {left:nw.x + width, top:nw.y + height});

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






