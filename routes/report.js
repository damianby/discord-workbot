const manager = require('../modules/manager')

const ejs_helpers = require('../Public/functions');


module.exports = function(req, res) {

    if(req.params.reportId) {
        let reports = manager.getOneTimeReport(req.params.reportId);

        if(reports) {
            res.render("report.html", {helpers: ejs_helpers, reports: reports});
        } else {
            res.render("missingreport.html");
        }
    } else {
        res.render("index.html");
    }
}