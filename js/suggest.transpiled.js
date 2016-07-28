'use strict';

Vue.component('googleMap', VueGoogleMap.Map);
Vue.component('googleMarker', VueGoogleMap.Marker);
Vue.component('googlePolyline', VueGoogleMap.Polyline);

Vue.directive('place-autocomplete', {
  params: ['place', 'bounds'],
  bind: function bind() {
    var _this = this;

    VueGoogleMap.loaded.then(function () {
      var autocomplete = new google.maps.places.Autocomplete(_this.el);

      autocomplete.addListener('place_changed', function (event) {
        _this.vm.$set(_this.params.place, autocomplete.getPlace());
      });
    });
  }
});

Vue.directive('validate', {
  params: ['validateRule', 'required', 'validateValue', 'vModel'],
  bind: function bind() {
    var _this2 = this;

    this.vm.$set(this.expression, {
      touched: false,
      valid: false
    });

    //
    var value = function value() {
      if (_this2.params.validateValue) {
        return _this2.vm.$get(_this2.params.validateValue);
      } else if (_this2.params.vModel) {
        return _this2.vm.$get(_this2.params.vModel);
      } else {
        return _this2.el.value;
      }
    };

    this.el.addEventListener('focus', function () {
      var val = _this2.vm.$get(_this2.expression);
      Vue.set(val, 'touched', true);
    });

    var runCheck = function runCheck() {
      var val = value();
      var validate = _this2.vm.$get(_this2.expression);

      if (_this2.params.required && !val) {
        validate.valid = false;
        return;
      }
      if (_this2.params.validateRule) {
        var rule = _this2.vm.$get(_this2.params.validateRule);
        if (rule && !rule(val)) {
          validate.valid = false;
          return;
        }
      }
      validate.valid = true;
    };

    if (this.params.validateValue) {
      this.vm.$watch(this.params.validateValue, runCheck);
    } else if (this.params.vModel) {
      this.vm.$watch(this.params.vModel, runCheck);
    } else {
      this.el.addEventListener('blur', runCheck);
    }
  }
});

VueGoogleMap.load({
  key: 'AIzaSyDC38zMc2TIj1-fvtLUdzNsgOQmTBb3N5M',
  libraries: 'places'
});

var INIT = {
  zoom: 11,
  center: { lat: 1.38, lng: 103.8 }
};

var vue = new Vue({
  el: '#submit-form',

  data: {
    Singapore: null,
    TimeGroups: [['06:00', '06:30'], ['07:00', '07:30'], ['08:00', '08:30'], ['09:00', '09:30'], ['10:00', '10:30'], ['11:00', '11:30'], ['12:00', '12:30'], ['13:00', '13:30'], ['14:00', '14:30'], ['15:00', '15:30']],
    center: INIT.center,
    zoom: INIT.zoom,
    suggestion: {
      origin: undefined,
      originPlace: undefined,
      destination: undefined,
      destinationPlace: undefined,
      originText: '',
      destinationText: ''
    },
    arrivalTime: undefined,
    emailVerification: null,
    email: '',
    noVerification: false,
    agreeTerms: false,
    focusAt: null,
    lock: new Auth0Lock('PwDT8IepW58tRCqZlLQkFKxKpuYrgNAp', 'beeline-suggestions.auth0.com', {
      auth: {
        redirect: false,
        params: {
          scope: 'openid name email'
        }
      },
      autoclose: true
    }),
    validation: {}
  },
  computed: {
    formValid: function formValid() {
      return _.every([this.suggestion.origin, this.suggestion.destination, this.email, this.arrivalTime, this.agreeTerms]);
    },
    path: function path() {
      if (_.get(this.suggestion, 'origin') && _.get(this.suggestion, 'destination')) {
        return [this.suggestion.origin, this.suggestion.destination];
      }
      return false;
    }
  },
  watch: {
    'suggestion.originPlace': function suggestionOriginPlace(place) {
      if (place && place.geometry) {
        this.suggestion.origin = place.geometry.location;
        this.zoomIn(this.suggestion.origin);
      } else {
        console.log(place);
      }
    },
    'suggestion.destinationPlace': function suggestionDestinationPlace(place) {
      if (place && place.geometry) {
        this.suggestion.destination = place.geometry.location;
        this.zoomIn(this.suggestion.destination);
      } else {
        console.log(place);
      }
    }
  },
  created: function created() {
    this.geocoderPromise = VueGoogleMap.loaded.then(function () {
      return new google.maps.Geocoder();
    });
  },
  ready: function ready() {
    var _this3 = this;

    this.lock.on('authenticated', function (authResult) {
      _this3.lock.getProfile(authResult.idToken, function (error, profile) {
        if (error) {
          alert("Your email could not be verified");
          return;
        }

        _this3.email = profile.email;
        _this3.emailVerification = {
          type: 'auth0',
          data: authResult.idToken
        };
      });
    });
  },

  methods: {
    submit: function submit(event) {
      var _this4 = this;

      event.preventDefault();

      // compute time as seconds past midnight
      var splitTime = this.arrivalTime.split(':');
      var time = splitTime[0] * 3600000 + splitTime[1] * 60000;

      this.$http.post('https://api.beeline.sg/suggestions/web', {
        time: time,
        boardLat: this.suggestion.origin.lat(),
        boardLon: this.suggestion.origin.lng(),
        alightLat: this.suggestion.destination.lat(),
        alightLon: this.suggestion.destination.lng(),
        email: this.email,
        emailVerification: this.emailVerification
      }).then(function (success) {
        $('#submitted-dialog').modal('show').on('hidden.bs.modal', function () {
          window.location.href = "/suggestSubmitted.html";
        });

        _this4.time = null;
        _this4.suggestion = {
          origin: null, destination: null, originPlace: null,
          destinationPlace: null
        };
      }, function (error) {
        $('#submitted-error-dialog').modal('show');
      });
    },
    click: function click(event) {
      var _this5 = this;

      if (this.focusAt) {
        var focusAt = this.focusAt;
        this.suggestion[this.focusAt] = event.latLng;

        // Reverse geocode...
        this.geocoderPromise.then(function (geocoder) {
          geocoder.geocode({ location: event.latLng }, function (results, status) {
            if (status === google.maps.GeocoderStatus.OK) {
              if (results[0]) {
                _this5.$set('suggestion.' + focusAt + 'Text', results[0].formatted_address);
              }
            }
          });
        });
      }
    },
    placeChanged: function placeChanged(which) {
      console.log(which);
    },
    zoomIn: function zoomIn(where) {
      this.center = where;
      this.zoom = 15;
    },
    zoomOut: function zoomOut() {
      if (this.suggestion.origin && this.suggestion.destination) {
        var bounds = new google.maps.LatLngBounds();
        bounds.extend(this.suggestion.origin);
        bounds.extend(this.suggestion.destination);
        this.$refs.map.fitBounds(bounds);
      } else {
        this.center = INIT.center;
        this.zoom = INIT.zoom;
      }
    },
    focusIn: function focusIn(which) {
      this.focusAt = which;
    },
    focusOut: function focusOut(which) {
      if (this.focusAt === which) {
        this.focusAt = null;
      }
    },
    login: function login() {
      var _this6 = this;

      this.lock.show({
        responseType: 'token'
      }, function (error, profile, idToken) {
        if (error) {
          alert("Your email could not be verified");
          return;
        }

        _this6.email = profile.email;
        _this6.emailVerification = {
          type: 'auth0',
          data: idToken
        };
      });
    },
    validLatLng: function validLatLng(latlng) {
      return latlng && latlng.lat() >= 1 && latlng.lat() <= 2 && latlng.lng() >= 100 && latlng.lng() <= 105;
    },
    showEmail: function showEmail() {
      this.emailVerification = null;
      this.noVerification = true;
    }
  }
});

VueGoogleMap.loaded.then(function () {
  vue.Singapore = new google.maps.LatLngBounds({ lat: 1.199038, lng: 103.591472 }, { lat: 1.522356, lng: 104.047404 });

  setTimeout(function () {
    var allAnchors = document.querySelectorAll('google-map a');
    for (var i = 0; i < allAnchors.length; i++) {
      allAnchors[i].tabIndex = -1;
    }
  }, 1000);
});
