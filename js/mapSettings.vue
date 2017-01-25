<script>
import Vue from 'vue';
import {loaded} from 'vue2-google-maps'
export default Vue.extend({
  data() {
    return {
      manWavingArmIcon: null,
      manWavingArmDarkIcon: null,
      defaultInfoWindowOptions: null,
      defaultMapOptions: {
        clickableIcons: false,
        streetViewControl: false,
        panControlOptions: false,
        gestureHandling: 'greedy',
      },
      Singapore: {
        north: 1.516329,
        east: 104.08,
        south: 1.1954,
        west: 103.5814
      },
    }
  },
  created() {
    loaded.then(() => {
      this.manWavingArmIcon = {
        url: '/images/man-waving-arm.png',
        scaledSize: new google.maps.Size(32,32)
      },
      this.manWavingArmDarkIcon = {
        url: '/images/man-waving-arm-black.png',
        scaledSize: new google.maps.Size(28,28)
      },
      this.defaultInfoWindowOptions = {
        pixelOffset: new google.maps.Size(0, -40)
      }
    })
  }
})

</script>
