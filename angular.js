
// Avoid polluting global space
// Note: in the real-world, these would be split up into different files
// They are merged here for convenience

(function()
{
    // --------------------------------------------------
    // app.js

    // Define an angular module for the application
    var capensis = angular.module('capensis', [
        'ngRoute',          // used for routing
        'ngSanitize',       // parse html into the view
        'ui.bootstrap',     // interface stuff
        'appControllers',   // module containing all of the controllers
        'appDirectives'     // module containing all of the custom directives
    ]);

    // Configure the module 
    capensis.config(['$routeProvider', '$locationProvider',
        function( $routeProvider , $locationProvider )
        {
            $routeProvider
                .when('/', {
                    redirectTo: '/projects'
                })
                .when('/skills', {
                    templateUrl: '/static/partials/skills.html',
                    controller: 'SkillsController',
                    controllerAs: 'sc'
                })
                .when('/projects', {
                    templateUrl: '/static/partials/project-list.html',
                    controller: 'ProjectListController',
                    controllerAs: 'plc'
                })
                .when('/resume', {
                    templateUrl: '/static/partials/resume.html',
                    controller: 'ResumeController',
                    controllerAs: 'rc'
                })
                .when('/projects/:itemId', {
                    templateUrl: '/static/partials/project-details.html',
                    controller: 'ProjectDetailsController',
                    controllerAs: 'pdc'
                })
                .otherwise({
                    redirectTo: '/projects'
                });

            // Get rid of hashes in the URL
            $locationProvider.html5Mode(true);
            console.log($locationProvider);
        }

    ]);

    // --------------------------------------------------
    // controllers.js

    var sampleApp = angular.module('sampleApp', []);

    // Navigation Controller
    sampleApp.controller('NavController', [
                 '$scope',
        function( $scope )
        {
            console.log("Loaded Navigation Controller");

            this.collapsed = true;

            this.toggleNav = function(){
                console.log("toggling");
                this.collapsed = !this.collapsed;
            }

        }
    ]);

    // Skills Controller
    sampleApp.controller('SkillsController', [ 
                 '$scope','$http','$routeParams',
        function( $scope , $http , $routeParams)
        {
            console.log("loading SkillsController");

            // Grab data file
            $http({
                method: 'GET',
                url: '/static/data/profile.json'
            })
            .success( function( data ){
                $scope.profile = data;
                init();
            })
            .error( function( error ){
                console.log(error);
            });

            // Draw the Pie Chart
            var init = function(){
                console.log("now we're getting somewhere");
                var donut_data = $scope.profile.distribution;

                // Graph Script
                var ctx = document.getElementById("chart-area").getContext("2d");
                window.myDoughnut = new Chart(ctx).Doughnut( donut_data, {responsive : true});
            }
        }
    ]);

    // Loads a list of all current projects
    // displays list of projects and filters them
    sampleApp.controller('ProjectListController' , [
                 '$scope','checkProjects','getWork',
        function( $scope , checkProjects , getWork )
        {
            console.log( "loading ProjectListController" );

            // load all projects
            getWork( $scope );

            // sort through work based on input
            this.applyFilter = function( category )
            {
                console.log("category:",category);
                $scope.project_filter = category;
            }

        }
    ]);

    // Presents details for a currently selected project
    sampleApp.controller('ProjectDetailsController' , [
                 '$scope','$routeParams','checkProjects','getWork',
        function( $scope , $routeParams , checkProjects , getWork )
        {
            console.log( "loading ProjectDetailsController" );

            $scope.displayDetails = function()
            {
                var projects = $scope.projects;
                var link = $routeParams.itemId;

                for( var i = 0 , length = projects.length ; i < length ; i++ ){
                    if( projects[i]['link'] == link ){
                        $scope.current_project = projects[i];
                        return;
                    }
                }
            }

            // display details after 
            getWork( $scope , $scope.displayDetails );
        }
    ]);


    // --------------------------------------------------
    // services.js

    // checks to see if projects are loaded into scope
    // to prevent reloading the same resources over and over again pointlessly
    sampleApp.factory('checkProjects' ,
        function checkProjects()
        {
            return function( $scope )
            {
                console.log("checking for projects");
                if( $scope.hasOwnProperty('projects') ) {
                    return true;
                } 
                return false;
            };
        }
    );

    // grab all work and inject it into a given scope
    // optionally, execute a callback
    sampleApp.service('getWork', [
                 '$http', 
        function( $http )
        {
            return function( $scope , callback )
            {
                $http({
                    method : 'GET',
                    url : '/static/data/work.json'
                })
                .success( function( data ){

                    console.log("work:" , data);

                    $scope.projects = data['projects'];
                    $scope.photos = data['photos'];
                    $scope.code_samples = data['code_samples'];
                    $scope.filters = data['filters'];

                    if( callback ){
                        callback();
                    }
                    return data;

                })
                .error( function( error ){
                    console.log( error );
                    swal("could not find data at that url");
                    return false;
                });
            }
        }
    ]);


    // --------------------------------------------------
    // directives.js

    sampleApp.directive('mainNavigation' , function()
    {
        return {
            restrict: 'E',
            templateUrl: '/static/partials/main-navigation.html',
            controller: 'MainNavigationController',
            controllerAs: 'mnc'
        }
    });

    sampleApp.directive('stylishDivider' , function()
    {
        return {
            restrict: 'E',
            templateUrl: '/static/partials/stylish-divider.html'
        }
    });

})(); // execute [en]closure at runtime

