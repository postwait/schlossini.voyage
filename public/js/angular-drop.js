(function(window, angular, undefined) {
  angular.module('ngDrop', [])
  .directive('sdropdown', function($document){
		return {
			restrict: "E",
			transclude: true,
			template:
			   "<div class='dropdown'><div ng-click='show = !show' class='dropdown-selector' ng-class='{glow: show}'> \
						<span ng-class='{grayed: !dropdownModel}'>{{dropdownPlaceholder}}</span> \
						<div class='arrow-down'></div>\
					</div> \
				<div ng-show='show' class='dropdown-wrapper'> \
					<sdropdown-search search-model='searchText' class='searchbox' placeholder='find item'></sdropdown-search> \
					<ul class='box' ng-transclude></ul> \
				</div></div>",
			scope: {
				dropdownModel: "=",
				dropdownPlaceholder: '@'
			},
			controller: function($scope){
				$scope.show = false;
				this.setModel = function(value){
					$scope.dropdownModel = value;
					$scope.dropdownPlaceholder = value;
					$scope.show = false;
					$scope.searchText = '';
				};
			},
			link: function(scope, element, attrs){
				element.bind('click', function(e){
					e.stopPropagation();
				});

				scope.$watch('searchText', function(text){
					if (text !== undefined){
						angular.forEach(element.find('sdropdown-group'), function(value){
							var is_group = true;
							angular.forEach(angular.element(value).find('sdropdown-item'), function(item){
								itemSpan = angular.element(item).find('span')[0];
								itemHtml = itemSpan.innerHTML;
								itemHtml = itemHtml.replace('<b>','').replace('</b>','');
								var i = itemHtml.toLowerCase().indexOf(text.toLowerCase());
								if (text !== '' && i === -1){
									item.hidden = true;
								} else {
									item.hidden = false;
									itemSpan.innerHTML = itemHtml.substring(0,i) + "<b>" + itemHtml.substring(i,i+text.length)+ "</b>" + itemHtml.substring(i+text.length);
									is_group = false;
								}
							});
							value.hidden = is_group;
						});
					}
				});

				$document.bind('click', function(event){
			        scope.show = false;
			        scope.$apply();
			    });
			}
		};
	})

	.directive('sdropdownGroup', function(){
		return {
			restrict: "E",
			transclude: true,
			template: "<li class='group'><div class='group-name'>{{name}}</div><hr><ul class='group-list'ng-transclude></ul></li>",
			scope: {
				name: "@"
			}
		};
	})

	.directive('sdropdownItem', function(){
		return {
			restrict: "E",
			transclude: true,
			require: "^sdropdown",
			template: "<div><li class='item' ng-transclude ng-click='setValue()'></li><hr><div>",
			scope: {},
			link: function(scope, elem, attrs, dropdown){
				scope.setValue = function(){
          TB.debug = function () {return elem};
          var val = elem.attr("sdropdown-value");
					dropdown.setModel((val !== null) ? val : elem.text());
				};
			},
		};
	})
	.directive('sdropdownSearch', function(){
       return {
            restrict: "E",
            scope: {
                placeholder: "@",
                searchModel: "="
            },
            template:
            '<div class="search">'+
            '   <div class="left">'+
            '       <div class="search-icon"></div>'+
            '   </div>'+
            '   <div class="right">'+
            '       <input class="search-input" type="text" ng-model="searchModel" placeholder="{{placeholder}}">'+
            '   </div>'+
            '   <div style="clear:both;"></div>'+
            '</div>',
        };
    });
})(window,window.angular);
