/*global angular, angularModuleExtension, horizon, rpc_templates */
/*jslint plusplus: true */
/*jshint camelcase: false */
'use strict';
// Redfining the entire horizonApp here because I can't find any other way of
// loading the ui.bootstrap module I want to use.
var horizon_dependencies = ['hz.conf', 'hz.utils', 'ngCookies', 'ui.bootstrap'];
var dependencies = horizon_dependencies.concat(angularModuleExtension);
var horizonApp = angular.module('hz', dependencies)
    .config(['$interpolateProvider', '$httpProvider',
        function ($interpolateProvider, $httpProvider) {
            $interpolateProvider.startSymbol('{$');
            $interpolateProvider.endSymbol('$}');
            $httpProvider.defaults.xsrfHeaderName = 'X-CSRFToken';
            $httpProvider.defaults.xsrfCookieName = 'csrftoken';
            $httpProvider.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';
        }])
    .run(['hzConfig', 'hzUtils', '$cookieStore',
        function (hzConfig, hzUtils, $cookieStore) {
            //expose the configuration for horizon legacy variable
            horizon.conf = hzConfig;
            horizon.utils = hzUtils;
            angular.extend(horizon.cookies = {}, $cookieStore);
            horizon.cookies.put = function (key, value) {
                //cookies are updated at the end of current $eval, so for the horizon
                //namespace we need to wrap it in a $apply function.
                angular.element('body').scope().$apply(function () {
                    $cookieStore.put(key, value);
                });
            };
        }]);

(function () {
    horizonApp.
        controller('rpc_heat', function ($scope, $sce, $modal, $http) {
            var i;

            $scope.alerts = [];
            $scope.parameters = {};
            $scope.parameters.details = {};

            $scope.closeAlert = function (index) {
                $scope.alerts.splice(index, 1);
            };
            
            horizon.init()
            horizon.modals.modal_spinner(gettext("Loading Solutions"));

            $http.get('/rackspace/solutions').
                success(function(data){
                    $scope.templates = data;
                    
                    for (i = 0; i < $scope.templates.length; i++) {
                        $scope.templates[i].title_safe = $sce.trustAsHtml($scope.templates[i].title);
                        $scope.templates[i].short_desc_safe = $sce.trustAsHtml($scope.templates[i].short_desc);
                        $scope.templates[i].long_desc_safe = $sce.trustAsHtml($scope.templates[i].long_desc);
                        $scope.templates[i].architecture_safe = $sce.trustAsHtml($scope.templates[i].architecture);
                    }
                    
                    horizon.modals.spinner.modal('hide');
                    
                    }).
                error(function(){
                    $scope.alerts.push({type: 'danger', msg: 'Could not load solutions catalog.'});
                    });

            $scope.parse_parameter = function (parameter) {
                var parameter_details;

                function safe_input_name(input_name) {
                    return input_name.replace(/-/g, '_');
                }

                function comma_delimited_list_parameter(parameter) {
                    var j,
                        input_name = safe_input_name(parameter.name),
                        item = '<div class="control-group" ' +
                            'ng-class="{ error: templateForm.' + input_name + '.$error.required}"' +
                            '>' +
                            '<label>' + parameter.label + ':</label>' +
                            '<select name="' + input_name + '" ' +
                                ' class="form-control"' +
                                ' value="' + parameter.default + '" ' +
                                ' tooltip="' + parameter.description + '" ' +
                                ' ng-model="parameters.details[\'' + parameter.name + '\']" required>';

                    $scope.parameters.details[parameter.name] = parameter['default'];

                    for (j = 0; j < parameter.constraints[0].allowed_values.length; j++) {
                        item += '<option>' + parameter.constraints[0].allowed_values[j] + '</option>';
                    }

                    item += '</select>' +
                        '</div>';

                    return item;
                }

                function number_parameter(parameter) {
                    var input_name = safe_input_name(parameter.name);

                    $scope.parameters.details[parameter.name] = parameter['default'];

                    return '<div class="control-group" ' +
                        'ng-class="{ error: (templateForm.' + input_name + '.$error.required || templateForm.' + input_name + '.$error.number)}"' +
                        '>' +
                        '<label for="' + input_name + '">' + parameter.label + ':</label>' +
                        '    <input type="number" id="' + input_name + '" name="' + input_name + '"' +
                        '      class="form-control"' +
                        '      value="' + parameter.default + '"' +
                        '      placeholder="' + parameter.description + '"' +
                        '      tooltip="' + parameter.description + '"' +
                        '      ng-model="parameters.details[\'' + parameter.name + '\']"' +
                        '      required' +
                        '    >' +
                        '    <span class="help-inline" ng-show="templateForm.' + input_name + '.$error.required">' + parameter.label + ' is a required field.</span>' +
                        '    <span class="help-inline" ng-show="templateForm.' + input_name + '.$error.number">Please enter a valid number.</span>' +
                        '</div>';

                }

                function string_parameter(parameter) {
                    var input_name = safe_input_name(parameter.name);

                    $scope.parameters.details[parameter.name] = parameter['default'];

                    return '<div class="control-group" ' +
                        'ng-class="{ error: (templateForm.' + input_name + '.$error.required || templateForm.' + input_name + '.$error.number)}"' +
                        '>' +
                        '<label>' + parameter.label + ':</label>' +
                        '<input name="' + input_name + '"' +
                            ' class="form-control"' +
                            ' value="' + parameter.default + '"' +
                            ' placeholder="' + parameter.description + '"' +
                            ' tooltip="' + parameter.description +
                            '" ng-model="parameters.details[\'' + parameter.name + '\']" required>' +
                            '  <span class="help-inline" ng-show="templateForm.' + input_name + '.$error.required">' + parameter.label + ' is a required field.</span>' +
                            '</div>';
                }

                switch (parameter.type) {
                case 'comma_delimited_list':
                    parameter_details = comma_delimited_list_parameter(parameter);
                    break;
                case 'string':
                    parameter_details = string_parameter(parameter);
                    break;
                case 'number':
                    parameter_details = number_parameter(parameter);
                    break;
                default:
                    parameter_details = '<p>Don\'t know how to deal with a ' + parameter.type + '</p>';
                }

                return '<div>' + parameter_details + '</div>';
            };

            //$scope.templates = rpc_templates;

            //for (i = 0; i < $scope.templates.length; i++) {
                //$scope.templates[i].title_safe = $sce.trustAsHtml($scope.templates[i].title);
                //$scope.templates[i].short_desc_safe = $sce.trustAsHtml($scope.templates[i].short_desc);
                //$scope.templates[i].long_desc_safe = $sce.trustAsHtml($scope.templates[i].long_desc);
                //$scope.templates[i].architecture_safe = $sce.trustAsHtml($scope.templates[i].architecture);
            //}

            $scope.more_info = function (solution) {
                var solution_id = solution.id;
                
                horizon.modals.modal_spinner(gettext("Loading Solution"));
                
                $http.get('/rackspace/solutions/' + solution_id).success(function (data){
                    var table = data,
                        modalInstance,
                        templateHeader = ' ' +
                            '<div class="modal-header">' +
                            '    <img ng-if="table.logo!=\'None\'" ng-src="{$table.logo$}" class="launch-logo">' +
                            '</div>',
                        templateBody = ' ' +
                            '<div class="modal-body">' +
                            '    <h2 ng-bind-html="table.title_safe"></h2><div ng-bind-html="table.long_desc_safe"></div>' +
                            '    <h3>Architecture</h3><div ng-bind-html="table.architecture_safe"></div>' +
                            '    <h3>Design Specs</h3><ul class="launch-design-specs">',
                        templateFooter = ' ' +
                            '<div class="modal-footer">' +
                            '    <button class="btn btn-primary" ng-disabled="!templateForm.$valid" ng-click="ok()">Launch Solution</button>' +
                            '    <button class="btn btn-warning" ng-click="cancel()">Cancel</button>' +
                            '</div>',
                        templateText;
                            
                    for (i = 0; i < table.design_specs.length; i++) {
                        templateBody += '<li>' + table.design_specs[i] + '</li>';
                    }
    
                    templateBody += '    </ul><h3>Parameters</h3>' +
                        '<form name="templateForm">';
    
                    for (i = 0; i < table.parameters.length; i++) {
                        templateBody += $scope.parse_parameter(table.parameters[i]);
                    }
    
                    templateBody += '    </form>' +
                        '</div>';
    
                    templateText = templateHeader + templateBody + templateFooter;
                    
                    horizon.modals.spinner.modal('hide');
    
                    modalInstance = $modal.open({
                        template: templateText,
                        controller: 'ModalInstanceCtrl',
                        size: 'lg',
                        resolve: {
                            table: function () {
                                return table;
                            },
                            parameters: function () {
                                return $scope.parameters;
                            }
                        }
                    });
    
                    modalInstance.result.then(function (solution) {
                        horizon.modals.modal_spinner(gettext("Working"));
                        $http.post(solution.launch_url, solution.details).
                            success(function (data) {
                                horizon.modals.spinner.modal('hide');
                                window.location = data; // server sends redirect URL in body
                            }).
                            error(function () {
                                horizon.modals.spinner.modal('hide');
                                $scope.alerts.push({type: 'danger', msg: 'Failed to launch solution.'});
                            });
                    });

                }).
                error(function (data, status, headers, config, status_text){
                $scope.alerts.push({type: 'danger', msg: 'error loading template ' + solution.title + '.'});
                })
            };

        });

    horizonApp.
        controller('ModalInstanceCtrl', function ($scope, $modalInstance, table, parameters) {
            $scope.table = table;
            $scope.parameters = parameters;

            $scope.ok = function () {
                $scope.parameters.id = table.id;
                $scope.parameters.launch_url = table.launch_url;
                $modalInstance.close($scope.parameters);
            };

            $scope.cancel = function () {
                $modalInstance.dismiss('cancel');
            };
        });
}());
