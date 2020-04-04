const express = require('express');
var router = express.Router();
var mkdirp = require('mkdirp')
var fs = require('fs-extra')
var mongoose = require('mongoose');

//Get Course Model
var Course = require('../models/course');

//Get Students Model
var Student = require('../models/student');

//Get Teachers Model
var Teacher = require('../models/teacher');

//Get TeacherDemand Model
var TeacherDemand = require('../models/teachers_demand');


//Get courses
router.get('/', ensureAuthenticated, (req, res) =>{
    // var count;
    // Course.countDocuments(function(err, c){
    //     if (err) throw err
    //     count = c; 
    // });
    
    Course.find(function(err, courses){
        res.render('./admin/courses',{
            title : "Courses Management",
            courses : courses,
            count: courses.length
        })
    })
})

//Admin Post add course
router.post('/add-course', ensureAuthenticated, function(req, res){
    var imageFile = typeof req.files.image !== "undefined" ? req.files.image.name : "";
    var timeTableFile = typeof req.files.timetable !== "undefined" ? req.files.timetable.name : "";

    req.checkBody('title', 'Title must have a value').notEmpty();
    req.checkBody('session', 'Session must have a value').notEmpty();
    req.checkBody('duration', 'Duration must have a value').notEmpty();
    req.checkBody('startdate', 'Startdate must have a value').notEmpty(); 
    req.checkBody('enddate', 'Endtdate must have a value').notEmpty();
    req.checkBody('content', 'Content must have a value').notEmpty();
    // req.checkBody('cost', 'Cost must have a value').notEmpty();
    // req.checkBody('category', 'Category must have a value').notEmpty();
    req.checkBody('description', 'Description must have a value').notEmpty();

    var type = req.body.type;
    var title = req.body.title;
    var session = req.body.session;
    var duration = req.body.duration;
    var startdate = req.body.startdate;
    var enddate = req.body.enddate;
    var content = req.body.content;
    // var cost = req.body.cost ;
    var category = "Enseignement";
    var description = req.body.description;

    var errors = req.validationErrors();
    if (errors) {
        req.flash('danger', "Veuillez remplir tous les champs avec (*)")
        res.redirect('/admin/home')

    }else{
        var course = new Course({
            type : type,
            title: title,
            session: session,
            duration : duration,
            startdate: startdate,
            enddate: enddate,
            cost: cost,
            content: content,
            description: description,
            category: category,
            timetable: timeTableFile,
            image: imageFile,
            dateposted: new Date().toLocaleDateString()
        });
        course.save(function(err) {
            if (err) return console.log(err);

            mkdirp('public/img/course_images/'+course._id, function(err){
                return console.log(err);
            });

            mkdirp('public/timetables/'+course._id, function(err){
                return console.log(err);
            });

            if(imageFile != ""){
                var courseImage = req.files.image;
                var path = 'public/img/course_images/'+course._id+'/'+imageFile;

                courseImage.mv(path, function(err){
                    return console.log(err);
                })
            }

            if(timeTableFile != ""){
                var courseTimeTable = req.files.timetable;
                var path2 = 'public/timetables/'+course._id+'/'+timeTableFile;

                courseTimeTable.mv(path2, function(err){
                    return console.log(err);
                })
            }

            req.flash('success', 'Cours Ajouté avec succès')
            res.redirect('/admin/home');
        })
    }
})

//Set a course to a teacher
router.get('/assign-course', ensureAuthenticated, (req, res) =>{
    Course.find(function(err, courses){
        if(err) return console.log(err)

        Teacher.find(function(err, teachers){
            if(err) return console.log(err)

            res.render("./admin/assign-class", {
                title : "Assign Course",
                courses: courses,
                teachers: teachers
            });
        })
    })
})

//Set a course to a teacher
router.post('/assign-course', ensureAuthenticated, (req, res) =>{
    var teacher_id = req.body.teacher_id;
    var course_id = req.body.hidden_course_id;

    //Je met à jour la table des cours et les cours du prof
    var query1 = {_id:  course_id};
    var query2 = {_id:  teacher_id};

    Teacher.findById(teacher_id, function(err, teacher){
        if(err) return console.log(err)

        Course.findOneAndUpdate(
            query1,
            {$push: {"teachers": {teacher_id: teacher._id, firstname: teacher.firstname, lastname: teacher.lastname, email: teacher.email, tel: teacher.tel, address: teacher.address, matiere: teacher.matiere}}},
            {safe: true, upsert: true},
            function(err, data){
                if(err) return console.log(err)

                Course.findById(course_id, function(err, course){
                    Teacher.findOneAndUpdate(
                        query2,
                        {$push: {"courses": {course_id: course_id, title: course.title, description : course.description, image: course.image, timetable: course.timetable}}},
                        {safe: true, upsert: true},
                        function(err, message){
                            if(err) return console.log(err)
                        }
                    );
                    require('../functions/assign_course_mail')(teacher.email, course.title, course._id, course.timetable);
                    req.flash('success', 'Course Successfully assigned')
                    res.redirect('/admin/courses/assign-course')
                })
            }
        );
    })

})

//Get courses details
router.get('/detail/:id', ensureAuthenticated, (req, res) =>{
    const id = req.params.id
    Course.findById(id, (err, course) => {
        if(err) return console.log(err)
        return res.render("./admin/course-details", {
            title : "Courses Details",
            course: course
        });
    })
})

//Delete  course 
router.get('/delete/:id', ensureAuthenticated, (req, res) =>{
    var id = req.params.id;

    var myquery = { _id: id };
    Course.deleteOne(myquery, function(err, obj) {
        if (err) throw err;
        console.log("Cours supprimé");
        req.flash('success', 'Cours supprimé avec succès');
        res.redirect('/admin/home')
    });
})

//accesss control
function ensureAuthenticated(req, res, next){
    if(req.isAuthenticated() && req.user.role == "admin"){
        return next()
    }else{
        req.flash('danger', 'Please login')
        res.redirect('/admin')
    }
}


//Exports 
module.exports = router;