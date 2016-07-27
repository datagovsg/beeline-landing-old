Vue.component('googleMap', VueGoogleMap.Map)
Vue.component('googleMarker', VueGoogleMap.Marker)
Vue.component('googlePolyline', VueGoogleMap.Polyline)

Vue.directive('place-autocomplete', {
  params: ['place', 'bounds'],
  bind() {
    VueGoogleMap.loaded.then(() => {
      var autocomplete = new google.maps.places.Autocomplete(this.el);

      autocomplete.addListener('place_changed', (event) => {
        this.vm.$set(this.params.place, autocomplete.getPlace())
      })
    })
  }
})

VueGoogleMap.load({
  key: 'AIzaSyDC38zMc2TIj1-fvtLUdzNsgOQmTBb3N5M',
  libraries: 'places',
})

const INIT = {
  zoom: 11,
  center: {lat: 1.38, lng: 103.8}
}

var vue = new Vue({
  el: '#submit-form',

  data: {
    Singapore: null,
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
    center: INIT.center,
    zoom: INIT.zoom,
    suggestion: {
      origin: undefined,
      originPlace: undefined,
      destination: undefined,
      destinationPlace: undefined,
      originText: '',
      destinationText: '',
    },
    arrivalTime: undefined,
    emailVerification: null,
    email: '',
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
        autoclose: true,
      }),
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
  },
  created() {
    this.geocoderPromise = VueGoogleMap.loaded.then(() => {
      return new google.maps.Geocoder;
    })
  },
  ready() {
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

      this.$http.post('http://localhost:8080/suggestions/web', {
        time: time,
        boardLat: this.suggestion.origin.lat(),
        boardLon: this.suggestion.origin.lng(),
        alightLat: this.suggestion.destination.lat(),
        alightLon: this.suggestion.destination.lng(),
        email: this.email,
        emailVerification: this.emailVerification
      })
      .then((success) => {
        $('#submitted-dialog').modal('show')
          .on('hidden.bs.modal', () => {
            window.location.href="/index.html"
          });

        this.time = null;
        this.suggestion = {
          origin: null, destination: null, originPlace: null,
          destinationPlace: null
        };
      }, (error) => {
        $('#submitted-error-dialog').modal('show');
      })
    },
    click(event) {
      if (this.focusAt) {
        var focusAt = this.focusAt;
        this.suggestion[this.focusAt] = event.latLng;

        // Reverse geocode...
        this.geocoderPromise.then((geocoder) => {
          geocoder.geocode({location: event.latLng}, (results, status) => {
            if (status === google.maps.GeocoderStatus.OK) {
              if (results[0]) {
                this.$set('suggestion.' + focusAt + 'Text',
                          results[0].formatted_address);
              }
            }
          })
        })
      }
    },
    placeChanged(which) {
      console.log(which);
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
    }
  }
})

VueGoogleMap.loaded.then(() => {
  vue.Singapore = new google.maps.LatLngBounds(
    {lat: 1.199038, lng: 103.591472},
    {lat: 1.522356, lng: 104.047404}
  )

  setTimeout(() => {
    var allAnchors = document.querySelectorAll('google-map a')
    for (var i=0; i<allAnchors.length; i++) {
      allAnchors[i].tabIndex = -1;
    }
  }, 1000)
})
