const Vue = require('vue');
const _ = require('lodash');
const VueGoogleMaps = require('vue2-google-maps');
const VueResource = require('vue-resource');
const querystring = require('querystring');
const moment = require('moment');
const mapSettings = require('./mapSettings.js').default;
const isWithinReach = require('./latlngDistance').isWithinReach;

Vue.use(VueResource);
Vue.use(VueGoogleMaps, {
  load: {
    client: 'gme-infocommunications',
    libraries: 'places',
  }
})

/**
  v-focus-placeholder: Set a different placeholder when the input is in focus
**/
Vue.directive('focus-placeholder', {
  bind(el, bind) {
    var originalPlaceholder = el.placeholder;
    var focusPlaceholder = el.dataset.focusPlaceholder;

    el.addEventListener('focus', () => {
      el.placeholder = focusPlaceholder;
    })
    el.addEventListener('blur', () => {
      el.placeholder = originalPlaceholder;
    })
  }
});

Vue.component('similarRequests', require('./similarRequests.vue'));
Vue.component('requestsTimeHistogram', require('./requestsTimeHistogram.vue'));
Vue.component('myValidate', {
  props: ['validateRule', 'required', 'validateValue'],
  data() {
    return {
      touched: false,
      childComponent: null,
      cachedValue: null,
    }
  },
  render(h) {
    return this.$slots.default[0];
  },
  watch: {
    touched() {
      this.emit()
    },
    valid() {
      this.emit()
    },
  },
  mounted() {
    this.childComponent = this.$children[0] ||
      this.$el;

    if (this.childComponent.$on) {
      this.childComponent.$on('focus', () => this.touched = true)
      this.childComponent.$on('input', (value) => this.cachedValue = value)

      if (this.childComponent.$el.addEventListener) {
        this.childComponent.$el.addEventListener('focus', () => this.touched = true)
      }
    } else if (this.childComponent.addEventListener) {
      this.childComponent.addEventListener('focus', () => this.touched = true)
      this.childComponent.addEventListener('input', () => {
        if (this.childComponent.type != 'checkbox') {
          this.cachedValue = this.childComponent.value
        }
      })
      this.childComponent.addEventListener('change', () => {
        if (this.childComponent.type == 'checkbox') {
          this.cachedValue = this.childComponent.checked
        }
      })
    }
  },
  created() {
    this.emit()
  },
  computed: {
    finalValidationValue() {
      var value1 = this.validateValue;
      var value3 = this.cachedValue;

      return value1 || value3;
    },
    valid() {
      return (!this.required || this.finalValidationValue) &&
        (!this.validateRule || this.validateRule(this.finalValidationValue))
    }
  },
  methods: {
    emit() {
      this.$emit('validation-changed', {
        touched: this.touched,
        valid: this.valid,
      });
    },
  },
});

var allCrowdstartedRoutes =
  Vue.resource('https://api.beeline.sg/custom/lelong/status')
     .get()
     .then(r => r.json())
     .then(rs => {
       for (let route of rs) {
         for (let trip of route.trips) {
           trip.tripStops = _.sortBy(trip.tripStops, 'time')
         }
       }
       rs.trips = _.sortBy(rs.trips, 'date')
       return rs;
     });

const INIT = {
  zoom: 11,
  center: {lat: 1.38, lng: 103.8}
}

var vue = new Vue({
  el: '#submit-form',

  data: {
    Singapore: {
      south: 1.199038,
      west: 103.591472,
      north: 1.522356,
      east: 104.047404
    },
    TimeGroups: [
      ['06:00', '06:30'],
      ['07:00', '07:30'],
      ['08:00', '08:30'],
      ['09:00', '09:30'],
      ['10:00', '10:30'],
      ['11:00', '11:30'],
      ['12:00', '12:30'],
      ['13:00', '13:30'],
      ['14:00', '14:30'],
      ['15:00', '15:30'],
    ],
    maxDistance: 1000,
    center: INIT.center,
    zoom: INIT.zoom,
    suggestion: {
      origin: null,
      originPlace: undefined,
      destination: null,
      destinationPlace: undefined,
      originText: '',
      destinationText: '',
      referrer: null
    },
    arrivalTime: '',
    emailVerification: null,
    email: '',
    noVerification: false,
    agreeTerms: false,
    focusAt: null,
    lock: new Auth0Lock(
      'PwDT8IepW58tRCqZlLQkFKxKpuYrgNAp',
      'beeline-suggestions.auth0.com', {
        auth: {
          redirect: false,
          params: {
            scope: 'openid name email'
          }
        },
        languageDictionary: {
          title: 'Beeline Suggestions'
        },
        theme: {
          logo: 'https://datagovsg.github.io/beeline-landing/images/beelineAuth0.png'
        },
        autoclose: true,
      }),
    mapSettings,
    similarRequests: {
      requests: [],
      hoveredRequest: null,
    },
    runningRoutes: [],
    crowdstartedRoutes: [],
    validation: {
      originValid: null,
      destinationValid: null,
      time: {
        touched: false,
        valid: false,
      },
      agreeTerms: null,
      email: null,
    },
    isEmail(str) {
      return /.+@.+\..+/i.test(str);
    }
  },
  computed: {
    formValid() {
      return _.every([
        this.suggestion.origin,
        this.suggestion.destination,
        this.email,
        this.arrivalTime,
        this.agreeTerms
      ])
    },
    path() {
      if (_.get(this.suggestion, 'origin') &&
          _.get(this.suggestion, 'destination')) {
        return [
          this.suggestion.origin,
          this.suggestion.destination
        ]
      }
      return false;
    }
  },
  watch: {
    'suggestion.originPlace'(place) {
      if (place && place.geometry) {
        this.suggestion.origin = place.geometry.location
        this.zoomIn(this.suggestion.origin);
      }
      else {
        console.log(place);
      }
    },
    'suggestion.destinationPlace'(place) {
      if (place && place.geometry) {
        this.suggestion.destination = place.geometry.location
        this.zoomIn(this.suggestion.destination);
      }
      else {
        console.log(place);
      }
    },
    'suggestion.origin'() {
      this.updateHash();
      this.updateSimilarRequests();
      this.updateRunningRoutes();
      this.updateCrowdstartedRoutes();
    },
    'suggestion.destination'() {
      this.updateHash();
      this.updateSimilarRequests();
      this.updateRunningRoutes();
      this.updateCrowdstartedRoutes();
    },
  },
  created() {
    this.geocoderPromise = VueGoogleMaps.loaded.then(() => {
      return new google.maps.Geocoder;
    })
  },
  mounted() {
    this.lock.on('authenticated', (authResult) => {
      this.lock.getProfile(authResult.idToken, (error, profile) => {
        if (error) {
          alert("Your email could not be verified");
          return;
        }

        this.email = profile.email;
        this.emailVerification = {
          type: 'auth0',
          data: authResult.idToken,
        };
      });
    })
  },
  methods: {
    submit(event) {
      event.preventDefault();

      // compute time as seconds past midnight
      var splitTime = this.arrivalTime.split(':')
      var time = splitTime[0] * 3600000 + splitTime[1] * 60000;

      var suggestionData = {
        time: time,
        boardLat: this.suggestion.origin.lat(),
        boardLon: this.suggestion.origin.lng(),
        alightLat: this.suggestion.destination.lat(),
        alightLon: this.suggestion.destination.lng(),
        email: this.email,
        emailVerification: this.emailVerification
      };
      if (this.suggestion.referrer) {
        _.assign(suggestionData, {
          referrer: this.suggestion.referrer
        })
      }

      this.$http.post('https://api.beeline.sg/suggestions/web', suggestionData)
      .then((success) => {
        $('#submitted-dialog').modal('show')
          .on('hidden.bs.modal', () => {
            if (this.emailVerification) {
              window.location.href = "suggestSubmitted.html"
            } else {
              window.location.href = "suggestVerify.html"
            }
          });

        this.time = null;
        this.suggestion = {
          origin: null, destination: null, originPlace: null,
          destinationPlace: null, referrer:null
        };
      }, (error) => {
        $('#submitted-error-dialog').modal('show');
      })
    },
    updateSimilarRequests() {
      if (this.suggestion.origin && this.suggestion.destination) {
        this.$http.get('https://api.beeline.sg/suggestions/web/similar?' + querystring.stringify({
          startLat: this.suggestion.origin.lat(),
          startLng: this.suggestion.origin.lng(),
          endLat: this.suggestion.destination.lat(),
          endLng: this.suggestion.destination.lng(),
          startDistance: this.maxDistance,
          endDistance: this.maxDistance,
        }))
        .then(r => r.json())
        .then(s => this.similarRequests.requests = s)
        .catch(err => console.error(err))
      }
    },
    updateRunningRoutes() {
      if (this.suggestion.origin && this.suggestion.destination) {
        Vue.resource('https://api.beeline.sg/routes/search_by_latlon?' + querystring.stringify({
            startLat: this.suggestion.origin.lat(),
            startLng: this.suggestion.origin.lng(),
            endLat: this.suggestion.destination.lat(),
            endLng: this.suggestion.destination.lng(),
            maxDistance: this.maxDistance,
            tags: JSON.stringify(['public']),
          })).get()
          .then(r => r.json())
          .then(rs => {
            for (let route of rs) {
              for (let trip of route.trips) {
                trip.tripStops = _.sortBy(trip.tripStops, 'time');
              }
            }
            rs.trips = _.sortBy(rs.trips, 'date');
            this.runningRoutes = rs;
          })
          .catch(err => console.error(err));
      }
    },
    updateCrowdstartedRoutes() {
      const origin = this.suggestion.origin;
      const destination = this.suggestion.destination;
      if (origin && destination) {
        allCrowdstartedRoutes.then(routes => routes.filter(route =>
          _.some(
            route.trips[0].tripStops,
            ts => ts.canBoard && isWithinReach(ts, origin, this.maxDistance)
          ) &&
          _.some(
            route.trips[0].tripStops,
            ts => ts.canAlight && isWithinReach(ts, destination, this.maxDistance)
          )
        ))
        .then(filteredRoutes => {
          this.crowdstartedRoutes = filteredRoutes;
        })
        .catch(err => console.error(err))
      }
    },
    updateHash() {
      window.location.hash = querystring.stringify(_.assign({},
        this.suggestion.origin ? {
          originLat: this.suggestion.origin.lat(),
          originLng: this.suggestion.origin.lng(),
        } : {},
        this.suggestion.destination ? {
          destinationLat: this.suggestion.destination.lat(),
          destinationLng: this.suggestion.destination.lng(),
        } : {}
      ))
    },
    departureTimeFor(route) {
      var tripStops = _.sortBy(route.trips[0].tripStops, ts => ts.time);
      return moment(tripStops[0].time).utcOffset(480).format('hh:mm');
    },
    arrivalTimeFor(route) {
      var tripStops = _.sortBy(route.trips[0].tripStops, ts => ts.time);
      return moment(tripStops[tripStops.length-1].time).utcOffset(480).format('hh:mm');
    },
    click(event) {
      if (this.focusAt) {
        this.setAndGeocodeLocation(this.focusAt, event.latLng)
      }
    },
    setAndGeocodeLocation(focusAt, latLng) {
      this.suggestion[focusAt] = latLng;

      // Reverse geocode...
      this.geocoderPromise.then((geocoder) => {
        geocoder.geocode({location: latLng}, (results, status) => {
          if (status === google.maps.GeocoderStatus.OK) {
            if (results[0]) {
              this.$set(this.suggestion, `${focusAt}Text`,
                        results[0].formatted_address);
            }
          }
        })
      })
    },
    zoomIn(where) {
      this.center = where;
      this.zoom = 15;
    },
    zoomOut() {
      if (this.suggestion.origin && this.suggestion.destination) {
        var bounds = new google.maps.LatLngBounds();
        bounds.extend(this.suggestion.origin);
        bounds.extend(this.suggestion.destination);
        this.$refs.map.fitBounds(bounds);
      }
      else {
        this.center = INIT.center;
        this.zoom = INIT.zoom;
      }
    },
    focusIn(which) {
      this.focusAt = which;
    },
    focusOut(which) {
      if (this.focusAt === which) {
        this.focusAt = null;
      }
    },
    login() {
      this.lock.show({
        responseType: 'token',
      }, (error, profile, idToken) => {
        if (error) {
          alert("Your email could not be verified");
          return;
        }

        this.email = profile.email;
        this.emailVerification = {
          type: 'auth0',
          data: idToken,
        }
      })
    },
    validLatLng(latlng) {
      return latlng &&
          (latlng.lat() >= 1 && latlng.lat() <= 2) &&
          (latlng.lng() >= 100 && latlng.lng() <= 105)
    },
    showEmail() {
      this.emailVerification = null;
      this.noVerification = true;
    },
    updatePlace(place) {
      this.suggestion[this.focusAt] = place.geometry.location;
    },
    setReferrer(referrer) {
      this.suggestion.referrer = referrer;
    }
  }
})

VueGoogleMaps.loaded.then(() => {
  setTimeout(() => {
    var allAnchors = document.querySelectorAll('google-map a')
    for (var i=0; i<allAnchors.length; i++) {
      allAnchors[i].tabIndex = -1;
    }
  }, 1000)
})

/* If there is a lat lng given in the hash */
; (function () {
  var hash = window.location.hash;
  if (!hash) return;
  hash = hash.substr(1);
  hash = querystring.parse(hash);

  VueGoogleMaps.loaded.then(() => {
    if (hash.originLat && hash.originLng) {
      vue.setAndGeocodeLocation('origin', new google.maps.LatLng({
        lat: parseFloat(hash.originLat),
        lng: parseFloat(hash.originLng)
      }))
    }

    if (hash.destinationLat && hash.destinationLng) {
      vue.setAndGeocodeLocation('destination', new google.maps.LatLng({
        lat: parseFloat(hash.destinationLat),
        lng: parseFloat(hash.destinationLng)
      }))
    }
  });

  if(hash.referrer) {
    vue.setReferrer(hash.referrer)
  }
})();
