
Vue.use(VueValidator);
Vue.component('placeInput', VueGoogleMap.PlaceInput);

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
  components: {
    googleMap: VueGoogleMap.Map,
    googleMarker: VueGoogleMap.Marker,
    googlePolyline: VueGoogleMap.Polyline
  },
  data() {
    return {
      center: {lat: 1.38, lng: 103.8},
      zoom: 11,
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
    }
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

var vue = new Vue({
  el: 'body',

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
    suggestion: {
      origin: undefined,
      destination: undefined,
    },
    validators: {
      email: {
        pattern: '/[^@\\s]+@[^@\\s\\.]+(\\.[^@\\s\\.]+)+/i',
      }
    }
  },
  watch: {
    'suggestion.destinationPlace'(place) {
      if (place) {
        this.suggestion.destination = place.geometry.location
        this.$nextTick(() => this.$refs.previewDestination.$emit('zoom'))
      }
    },
    'suggestion.originPlace'(place) {
      if (place) {
        this.suggestion.origin = place.geometry.location
        this.$nextTick(() => this.$refs.previewOrigin.$emit('zoom'))
      }
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
