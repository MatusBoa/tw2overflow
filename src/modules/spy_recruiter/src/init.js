require([
    'two/ready',
    'two/___spy_recruiter_id',
    'two/___spy_recruiter_id/ui',
    'two/___spy_recruiter_id/events'
], function (
    ready,
    ___spy_recruiter_id,
    ___spy_recruiter_idInterface
) {
    if (___spy_recruiter_id.isInitialized()) {
        return false;
    }

    ready(function () {
        ___spy_recruiter_id.init();
        ___spy_recruiter_idInterface();
    });
});
