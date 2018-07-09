const userType = 'student'

var fs = require('fs')

var auth = require('../auth')
var wrongUserType = require('../wrongusertype')

var bodyparsermodule = require('../../lib/htmldyn/bodyparsermodule')

exports.filePath = ''

exports.servePage = (req, res, body) => {

    auth.postAuth(req, res, (currentUser, currentUserType) => {

        if(userType !== currentUserType) {

            wrongUserType.servePage(req, res)

            return
        }

        var postParams = bodyparsermodule.parseHttpBody(body);

        console.log(postParams)

        res.writeHead(200, {
            'Content-Type': 'application/json'
        })
        res.end(JSON.stringify(postParams))

    })
}