<script>
import {Bar, mixins} from 'vue-chartjs';
import _ from 'lodash';
import mapSettings from './mapSettings.js';
import leftPad from 'left-pad';

export default Bar.extend({
  props: ['requests'],
  mounted() {
    this.renderChart(this.chartData, {
      legend: {display: false},
      maintainAspectRatio: false,
      responsive: false,
      scales: {
        xAxes: [{
          categoryPercentage: 0.8,
          barPercentage: 0.9,
        }]
      }
    })
  },
  watch: {
    chartData() {
      this._chart.data.labels = this.chartData.labels
      this._chart.data.datasets = this.chartData.datasets
      this._chart.update()
    },
  },
  computed: {
    chartData() {
      return {
        labels: this.summarizeLabels,
        datasets: [{
          backgroundColor: '#f87979',
          data: this.summarizeCounts
        }]
      }
    },
    summary() {
      return _(this.requests)
        .groupBy('time')
        .toPairs()
        .map(([x,y]) => [x, y.length])
        .sortBy(x => x[0])
        .value()
    },
    summarizeCounts() {
      return this.summary.map(x => x[1])
    },
    summarizeLabels() {
      return this.summary.map(x => {
        var ms = x[0];
        var hrs = Math.floor(ms / 3600 / 1000);
        var mins = Math.floor((ms % 3600000) / 60000)

        return leftPad(hrs, 2, '0') + ':' + leftPad(mins, 2, '0');
      })
    }
  },
})
</script>
