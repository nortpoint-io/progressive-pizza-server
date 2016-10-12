(function($) {
    var sendMessageBtns = $('.subscriptions-table');

    sendMessageBtns.on('click', function(event) {
        event.preventDefault();

        var registrationId = $(event.target).parent().prev('td').html();
        $('#registration-id').val(registrationId);
    });
})(jQuery);
