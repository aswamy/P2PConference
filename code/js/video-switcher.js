$('.broadcaster').click(function() {
    console.log('clicky');
    var temp = this.src;
    this.src = $('#mainvideo')[0].src;
    $('#mainvideo')[0].src = temp;
});