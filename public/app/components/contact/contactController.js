angular.module("TriForC")
.controller('ContactController', function($scope, vcRecaptchaKey, vcRecaptchaTheme, Contact) {
    var ctrl = this;

    ctrl.showForm = true;
    ctrl.showMessage = false;
    ctrl.submitMessage = "";
    ctrl.response = null;
    ctrl.form = {};
    ctrl.captcha = {
        key: vcRecaptchaKey,
        theme: vcRecaptchaTheme,
        response: null
    };

    ctrl.submitContactForm = function() {
        if (!$("#inputName").val().length || !$("#inputEmail").val().length || !$("#inputSubject").val().length || !$("#textArea").val().length) {
            return alert("Please fill in all the fields in the contact form.");
        }
        ctrl.submitted = false;
        ctrl.submitMessage = "Your form is being submitted...";
        ctrl.showForm = false;
        ctrl.showMessage = true;
        Contact.save({captcha: ctrl.captcha.response}, ctrl.form, function(response) {
            ctrl.submitted = false;
            ctrl.submitMessage = response.message;
            if (response.success == 1) {
                ctrl.form = {}
                ctrl.captcha.response = null;
            }
        }, function() {
            alert("Could not contact the server!");
        });
    };

    ctrl.showContactForm = function() {
        ctrl.submitMessage = "";
        ctrl.showMessage = false;
        ctrl.showForm = true;
    };

});