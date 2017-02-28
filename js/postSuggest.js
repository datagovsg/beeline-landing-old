const Vue = require('vue');
const querystring = require('querystring');

document.addEventListener('DOMContentLoaded', () => {
  const vue = new Vue({
    el: '#share-link-section',
    data: {
      hash: null,
      shareLink: '',
    },
    created: function () {
      try {
        if (window.location.hash) {
          this.hash = querystring.parse(window.location.hash.replace(/^#/, ''));
          this.shareLink = `https://www.beeline.sg/suggest.html#` +
            querystring.stringify(this.hash);
        }
      } catch(err) {}
    }
  })

  if (Clipboard) {
    new Clipboard('.btn');
  }
})
