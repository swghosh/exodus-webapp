var fs = require('fs')
var events = require('events')

var auth = require('./auth')

var htmldynmodule = require('../lib/htmldyn/htmldynmodule')

var blAssignments = require('../lib/bl/assignments')
var blCourses = require('../lib/bl/courses')
var blIdNames = require('../lib/bl/idnames')

exports.filePath = ''

exports.servePage = (req, res) => {

    var filePath = exports.filePath

    auth.postAuth(req, res, (currentUser, currentUserType) => {

        var values = JSON.parse(fs.readFileSync('dyns/globalvars.json', 'utf8'));

        switch(currentUserType) {
            case 'student':
            blCourses.listCourses = blCourses.listCoursesForStudent
            break
            case 'faculty':
            blCourses.listCourses = blCourses.listCoursesForFaculty
            break
        }

        values.username = currentUser.username
        values.usertype = currentUserType
        values.pagetitle = "List of Assignments"

        res.writeHead(200, {
            'Content-Type': 'text/html'
        })

        fs.readFile(__dirname + `/${currentUserType}/template.html`, 'utf8', (err, templateHtml) => {
            fs.readFile(filePath, 'utf8', (err, viewHtml) => {
                values.content = viewHtml

                var contentHtml = htmldynmodule.getHtmlStringWithIdValues(templateHtml, values)

                var assignments = []

                blCourses.listCourses({_id: currentUser[currentUserType]}, (courses) => {
                    multipleAssignments(courses, (assignments) => {
                        multipleIdNames(assignments, (assignments) => {
                            values.table = makeTable(assignments)

                            res.end(htmldynmodule.getHtmlStringWithIdValues(contentHtml, values))
                        })
                    })
                })
            })
        })

    })
}

var makeTable = (assignments) => {

    // sort assignments on the basis of publishDate (descending)
    assignments.sort((assignmentA, assignmentB) => assignmentB.publishDate - assignmentA.publishDate)

    var html = ''

    for(var assignment of assignments) {

        assignment.submitDate = new Date(assignment.submitDate).toDateString()
        assignment.publishDate = new Date(assignment.publishDate).toDateString()

        var eleBr = htmldynmodule.getHtmlTagString('br')

        var eleSmall = htmldynmodule.getHtmlTagString('small', `(due: ${assignment.submitDate})`, 'code')
        var eleTdTitle = htmldynmodule.getHtmlTagString('td', `posted, 🗓 ${assignment.publishDate} ${eleSmall}`, 'title')
        var eleH3 = htmldynmodule.getHtmlTagString('h3', 'Assignment')

        var eleCodes = htmldynmodule.getHtmlTagString('code', `id: ${assignment.name}`, 'id') + ', ' + htmldynmodule.getHtmlTagString('code', `course: ${assignment.course}`, 'id')
        var eleButton = htmldynmodule.getHtmlTagString('span', '📎 Open', 'downloadbutton')
        var eleAnchor = htmldynmodule.getHtmlTagString('a', eleButton, 'nouline defaultcolor', undefined, {
            href: '/documents/' + assignment.name + 'Assignment_' + assignment.document + '.document'
        })

        var eleTdContent = htmldynmodule.getHtmlTagString('td', `${eleH3} ${eleCodes} ${eleBr} ${eleBr} ${eleAnchor} ${eleBr} ${eleBr} An ${assignment.course} assignment that is to be submitted on or before ${assignment.submitDate}.`, 'content')

        var eleTr = htmldynmodule.getHtmlTagString('tr', eleTdTitle + eleTdContent, 'card')

        html += eleTr
    }

    return html
}

var multipleIdNames = (objects, callback) => {

    if(objects.length == 0) {
        callback(objects)
        return
    }

    var tracker = new events.EventEmitter()
    tracker.soFar = 0

    tracker.on('add', () => {
        tracker.soFar += 1
        if(tracker.soFar == objects.length) {
            tracker.emit('end')
        }
    })

    tracker.on('end', () => {
        callback(objects)
    })

    for(let index = 0; index < objects.length; index++) {
        blIdNames.getIdName(objects[index]._id, (name) => {
            objects[index].name = name
            tracker.emit('add')
        })
    }
}

var multipleAssignments = (courses, callback) => {

    if(courses.length == 0) {
        callback([])
        return
    }

    var assignments = []

    var tracker = new events.EventEmitter()
    tracker.soFar = 0

    tracker.on('add', () => {
        tracker.soFar += 1
        if(tracker.soFar == courses.length) {
            tracker.emit('end')
        }
    })

    tracker.on('end', () => {
        callback(assignments)
    })

    for(let index = 0; index < courses.length; index++) {
        blAssignments.listAssignmentsByCourse(courses[index], (courseAssignments) => {
            courseAssignments = courseAssignments.map((assignment) => {
                assignment.course = courses[index].code
                return assignment
            })
            assignments = assignments.concat(courseAssignments)
            tracker.emit('add')
        })
    }
}