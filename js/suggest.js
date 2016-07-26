
Vue.use(VueValidator);
Vue.component('placeInput', VueGoogleMap.PlaceInput);

Vue.component('googleMap', VueGoogleMap.Map)
Vue.component('googleMarker', VueGoogleMap.Marker)
Vue.component('googlePolyline', VueGoogleMap.Polyline)
Vue.component('suggestPreview', {
  template: `
<google-map :center="center" :zoom="zoom" @g-click="click">
  <google-marker v-if="suggestion.origin"
                  :position="suggestion.origin">
  </google-marker>
  <google-marker v-if="suggestion.destination"
                  :position="suggestion.destination">
  </google-marker>
  <google-polyline v-if="path" :path="path">
  </google-polyline>
</google-map>
  `,
  props: ['centerAt', 'suggestion'],
  data() {
    return {
    }
  },
  computed: {
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
  methods: {
    click(events) {
      this.centerAt = {
        lat: events.latLng.lat(),
        lng: events.latLng.lng(),
      }
    },
  },
  events: {
    zoom() {
      this.center = this.centerAt;
      this.zoom = 15;
    }
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
      arrivalTime: undefined,
    },
    validators: {
      email: {
        pattern: '/[^@\\s]+@[^@\\s\\.]+(\\.[^@\\s\\.]+)+/i',
      }
    },
    emailVerification: null,
    email: ''
  },
  computed: {
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
    'suggestion.destinationPlace'(place) {
      if (place) {
        this.suggestion.destination = place.geometry.location
        this.zoomIn(this.suggestion.destination);
      }
    },
    'suggestion.originPlace'(place) {
      if (place) {
        this.suggestion.origin = place.geometry.location
        this.zoomIn(this.suggestion.origin);
      }
    }
  },
  methods: {
    submit(event) {
      event.preventDefault();
      this.$http.post('https://api.beeline.sg/suggestions/web', {
        arrivalTime: this.arrivalTime,
        boardLat: this.suggestion.origin[0],
        boardLon: this.suggestion.origin[1],
        alightLat: this.suggestion.destination[0],
        alightLon: this.suggestion.destination[1],
        email: this.email,
        emailVerification: this.emailVerification
      })
      .then((success) => {
        alert('Submitted!')
      }, (error) => {
        alert('Error')
      })
    },
    click(event) {

    },
    placeChanged(which) {
      // Update validation
      this.$validate(which);

      //
    },
    zoomIn(where) {
      console.log(where);
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
    }
  }
})

function onSignIn(googleUser) {
  var profile = googleUser.getBasicProfile();

  vue.emailVerification = {
    type: 'Google',
    data: googleUser.getAuthResponse().id_token
  };
  vue.email = profile.getEmail();
}
function signOut() {
  var auth2 = gapi.auth2.getAuthInstance();
  auth2.signOut().then(function () {
    console.log('User signed out.');
  });
}

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
