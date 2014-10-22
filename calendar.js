

// jQuery Wrapper
$(document).ready(function(){



	// Parent Object
	CalendarObject = {}; 



	// ---------------------------------------------------------------------------------------------------------------
	CalendarObject.Globals = {
	// ---------------------------------------------------------------------------------------------------------------

		current_date_object 											: $.code_snippets.get_current_date_object(),

		// 

		current_day 															: null,
		current_month 														: null,
		current_year 															: null,

		initialize: function() {
			CalendarObject.Globals.current_day 			= CalendarObject.Globals.current_date_object.dayNumber; 
			CalendarObject.Globals.current_month 		= CalendarObject.Globals.current_date_object.month;  
			CalendarObject.Globals.current_year 		= CalendarObject.Globals.current_date_object.year; 
		},

		// 

		array_of_event_ids_already_loaded					: [], // small array that stores the ID of events already loaded by the user
		array_of_events_already_loaded 						: [], // JSON objects for events that are already loaded 

		// 

		current_event_id 													: null, 
		// current_event_start 										: { year: 0, month:0, day:0, hour:0, minute:0, second:0 }, // DEPRECATED - here for reference
		// current_event_finish 									: { year: 0, month:0, day:0, hour:0, minute:0, second:0 }, 

		// USED FOR AUTO-SAVE --------------------	------------------------------------------------------------------------

		// previous_event_id 												: null, // DEPRECATED
		server_is_busy 														: false, // any load_event should set this to true onLoad and "false" at the END of a server response
		// user_is_switching_between_events 					: false, // DEPRECATED

		// USED FOR NAVIGATION -------------------	-------------------------------------------------------------------------
		current_display_system 										: "display_system", 	// the currently selected / visible display system
																																		// can be "display_system" || "new_event_system"

		// USED FOR VISUALS ----------------------	----------------------------------------------------------------------
		css_height_of_time_slice 									: 22, // panels.css - .calendar_time_bar {} // FORMULA : height of time slice + margin-top 

	};
	// Stupid shortcomings of JavaScript.....
	CalendarObject.Globals.initialize(); 



	// ---------------------------------------------------------------------------------------------------------------
	CalendarObject.Navigation = {
	// ---------------------------------------------------------------------------------------------------------------

		switch_to_system : function(what_view) {

			// We'll do this more efficiently later :P
			$('.panel.calendar .display_system 		').hide();
			$('.panel.calendar .new_event_system 	').hide();
			$('.panel.calendar .time_match_system ').hide();

			switch(what_view) {

				case "display" :
					$('.panel.calendar .display_system			').show();
					CalendarObject.Globals.current_display_system = "display_system"; 
					break;

				case "new_event" :
					$('.panel.calendar .display_system			').show();
					$('.panel.calendar .new_event_system		').show();
					CalendarObject.Globals.current_display_system = "new_event_system"; 
					break;

				case "time_match" :
					$('.panel.calendar .time_match_system		').show();
					CalendarObject.Globals.current_display_system = "time_match_system"; 
					break;

				default :
					console.warn("switch_to_system - you have not specified a correct view!");
					break;

			} // END - switch (what_view)

		} // END - switch_to_system()

	};



	// ---------------------------------------------------------------------------------------------------------------
	CalendarObject.MonthView = {
	// ---------------------------------------------------------------------------------------------------------------

		create_month_view: function(){

			// The raw month view - with no real data 

			var day_array ='';
			var monthLength = 30;

			for( var i = 42 ; i-- ; ){
				day_array+= '<div class="calendar_day_block"><p>??</p></div>';
			}

			var day_grid =
				'<div class="calendar_day_grid">' +
					day_array +
				'</div>';

			var day_names =
				'<div class="calendar_day_names">' +
					'<ul>'+
						'<li class="calendar_day_name">M</li>' + // Mon // Mo
						'<li class="calendar_day_name">T</li>' + // Tue // Tu
						'<li class="calendar_day_name">W</li>' + // Wed // We
						'<li class="calendar_day_name">T</li>' + // Thu // Th
						'<li class="calendar_day_name">F</li>' + // Fri // Fr
						'<li class="calendar_day_name">S</li>' + // Sat // Sa
						'<li class="calendar_day_name">S</li>' + // Sun // Su
					'</ul>' +
				'</div>';

			var float_ender = '<div class="float_ender"></div>';

			var month_view_html =
				'<div class="calendar_month_grid">' +
					day_names +
					day_grid +
					float_ender +
				'</div>';

			//return html;
			$('.panel.calendar .display_system .month_view').html(month_view_html);

		},

		//

		highlight_current_day : function() {

			// Highlights the current day block in the month view

			var current_day = CalendarObject.Globals.current_day; 
			if (current_day.toString().length == 1) { current_day = "0" + current_day; } // Fail-safe

			// Clear up any days that might already be selected
			$('.panel.calendar .display_system .calendar_day_grid .calendar_day_block.selected').removeClass('selected');

			// Cycle through each element that has the correct day
			$('.panel.calendar .display_system .calendar_day_grid .calendar_day_block[data-id=' + current_day + ']').each(function(index) {

				if( $(this).hasClass('faded') ){
					//console.log("found faded element"); 
				} else {
					//console.log("added class"); 
					$(this).addClass('selected');
				}

			});

		},

		//

																				// use to denote days that contain events 
		array_of_days_with_events : [], 		// populated through paint_event_list_element()

		highlight_days_with_events : function() {

			// Remove any existing classes
			$('.panel.calendar .calendar_day_block').removeClass('has_event');

			// Mark days on the calendar that have events
			var event_day_array 	= CalendarObject.MonthView.array_of_days_with_events; 
			var total_days 				= event_day_array.length;

			for ( var i = total_days ; i-- ; ){ // loop backwards for SPEED 
				var day_number 				= event_day_array[i].toString();
				$('.panel.calendar .calendar_day_block[data-id="' + day_number + '"]').addClass('has_event'); 
			} // END - for()

		}, // END - highlight_days_with_events

		// 

		refresh_month_view : function(event_id) {

			// Hits the server for data with which to populate the month view
			// console.log("MONTH VIEW REFRESH WAS CALLED"); 

			// Don't want any residue events...
			CalendarObject.EventDetails.clear_existing_event_details(); 

			// Refresh the day view as well - 
			// NOTE : - if you ever decide not to refresh the day view, MAKE SURE that you keep [clear_existing_event_details()] to avoid bugs!
			
			// CalendarObject.DayView.refresh_day_view(event_id); 

			// If the user is clicking on days of the month view, we want to switch emptily
			// BUT - if the month/day view was refreshed because the user clicked on an event, we DON'T want to clear details 
			if(event_id == undefined){
				// Clear any event details from selected events 
				CalendarObject.EventDetails.clear_existing_event_details(); 
				// Display the HELPER panel 
				CalendarObject.EventDetails.display_event_details_panel(false); 
			} else {
				CalendarObject.DayView.scroll_to_time_slice(event_id);
			}



			// Fade in our loader
			$('.panel.calendar .display_system .left_panel .load_overlay').show(); 

			var data = {
				"action" 				: "CALENDAR_MONTH_VIEW",
				"credentials" 	: CREDENTIALS_OBJECT, // user authentication
				"year" 					: CalendarObject.Globals.current_year,
				"month" 				: CalendarObject.Globals.current_month
			}

			$.post(API_PHP_URL + 'api.php', data, function(responseText){
				try {

					var result = JSON.parse(responseText);
					var month_name = result['name'][2];
					var year = result['year'];
					
					// update the interface
					$('.panel.calendar .display_system .month_label').html(month_name + ' ' + year);

					// --------------------------------------------------------------------------------------
					// TODO : 
					// update the calendar with days-of-week
					// right now, it's buggy
					/*
					for (var i=0; i < result['days_of_week'].length; i++) {
						var target = $('.panel.calendar .calendar_month_grid li.calendar_day_name:nth-child(' + (i) + ')');
						target.html(result['days_of_week'][i][0]);
					}
					*/

					// --------------------------------------------------------------------------------------
					// update the days of the month

					$('.panel.calendar .calendar_day_block').removeClass('faded');

					var cursor 					= 1;
					var total_weeks 		= result['days_of_month']['weeks'].length;
					var total_days 			= result['days_of_month']['weeks'][0].length; // all weeks have the same length... usually :P

					for ( var week=0 ; week < total_weeks; week+=1 ) {
						// 
						for ( var day=0 ; day < total_days; day+=1 ) {

							var value 							= result['days_of_month']['weeks'][week][day]['d'];
							var month_of_value 			= result['days_of_month']['weeks'][week][day]['m']; 
							var target_element 			= $('.panel.calendar .calendar_day_block:nth-child(' + cursor + ')');

							target_element.html('<p>' + value + '</p>');
							target_element.attr('data-id' , value);

							if (month_of_value != CalendarObject.Globals.current_month){
								target_element.addClass('faded'); 
							}

							// proceed to next item..
							cursor ++;

						}
					}

					// --------------------------------------------------------------------------------------
					// update the list of events

					console.log("list of events = ", result);

					// Might have to refactor or replace this at some point ]
					// - put it into a separate function, and have that function called here. 
					$('.panel.calendar .display_system .event_list.month').html(CalendarObject.MonthEventList.paint_event_list(result['events']));

					// Bind the new list items
					CalendarObject.MonthEventList.bind_all_event_list_elements();

					// --------------------------------------------------------------------------------------

					// Bind the calendar grid items
					CalendarObject.MonthView.bind_all_calendar_grid_elements(); 

					// Highlight the right day in the month view - IF applicable
					CalendarObject.MonthView.highlight_current_day(); 

					// Highlight days on the month view grid that contain events // NNNN
					CalendarObject.MonthView.highlight_days_with_events(); 

					// ---------------------- 

					// Fade OUT loader on complete
					$('.panel.calendar .display_system .left_panel .load_overlay').fadeOut(FADE_OUT_SPEED); 

				} catch(e) {
					alert("Unknown error "+ e +".");
					return;
				}
			});

		}, // END - refresh()

		//

		next_month : function() {

			if (CalendarObject.Globals.current_month < 12) {
				CalendarObject.Globals.current_month ++;
			} else {
				CalendarObject.Globals.current_month = 1;
				CalendarObject.Globals.current_year ++;
			}

			CalendarObject.MonthView.refresh_month_view();
			CalendarObject.DayView.refresh_day_view();
		},

		//
		
		previous_month : function() {

			if (CalendarObject.Globals.current_month > 1) {
				CalendarObject.Globals.current_month --;
			} else {
				CalendarObject.Globals.current_month = 12;
				CalendarObject.Globals.current_year --;
			}

			CalendarObject.MonthView.refresh_month_view();
			CalendarObject.DayView.refresh_day_view();
		},

		// 

		bind_buttons: function() {

			// NEXT MONTH
			$('.panel.calendar .month_view_next_button').unbind();
			$('.panel.calendar .month_view_next_button').bind('tap click', function(event){
				CalendarObject.MonthView.next_month();
			});

			// PREVIOUS MONTH
			$('.panel.calendar .month_view_prev_button').unbind();
			$('.panel.calendar .month_view_prev_button').bind('tap click', function(event){
				CalendarObject.MonthView.previous_month();
			});

		},

		bind_all_calendar_grid_elements : function() {

			$('.panel.calendar .display_system .calendar_day_grid .calendar_day_block').unbind();
			$('.panel.calendar .display_system .calendar_day_grid .calendar_day_block').bind('tap click', function(event) {
				
				// Make sure that we're dealing with the correct month
				var is_faded = $(this).hasClass('faded');
				//
				if(!is_faded){

					var day_number = $(this).find('p').html();
					console.log("Switching to day... " , day_number); 

					CalendarObject.Globals.current_day = day_number;

					// Highlight the right day in the month view
					CalendarObject.MonthView.highlight_current_day(); 

					// Load up the right day view
					CalendarObject.DayView.refresh_day_view(); 

					// Display the .day_event_list
					CalendarObject.EventListController.switch_to_event_list("day"); 

				} 
				else {
					// TODO : 
					// The user clicks on a day number that falls outside the scope of the current month
				}

			});

		},

		initialize: function() {
			CalendarObject.MonthView.create_month_view();
			CalendarObject.MonthView.refresh_month_view();
			CalendarObject.MonthView.bind_buttons();
		}

	}; // END - CalendarObject.MonthView


	// ---------------------------------------------------------------------------------------------------------------
	CalendarObject.DayView = {
	// ---------------------------------------------------------------------------------------------------------------

		// FUNCTIONS

		create_day_view : function() {
		// The time slices of an entire day, laid out. 

			// DAY PROPERTIES
			var day_length = 24;
			var increments = 0.25;  // SET TO ANY FRACTION OF AN HOUR - EX.  - 1 / 0.5 / 0.25 -
			var total_bars = day_length / increments;

			// OPEN THE GRIDS
			var time_value_grid = 	'<div class="calendar_time_value_grid">'; 						// OPEN THE DIV
			var time_bar_grid = 		'<div class="calendar_time_bar_grid">'; 							// OPEN THE DIV
			var time_slice_grid = 	'<div class="calendar_time_slice_grid">' + '</div>'; 	// doesn't have anything in it at first

			for(var i=0; i<total_bars; i++){

				var hour_value = (increments * i);
				var minute_value = ((hour_value % 1) * 60).toFixed(0);  // Need toFixed() to iron out an unpleasant decimal places bug.
				var hour_string = Math.floor(hour_value).toString();

				// Fix the formatting for the minutes
				if(minute_value != 0){
					var minute_string = minute_value.toString();
				} else {
					var minute_string = '00';
				}

				// Fix the formatting for the hours
				if (hour_value < 10){
					hour_string = "0" + hour_string; 
				}

				var final_time = hour_string + ':' + minute_string;

				// Update the Time Value Grid
				time_value_grid 	+= '<div class="calendar_time_value"><p>' + (final_time) + '</p></div>'; /* used to have a - at the end*/

				// Update the Time Slice Grid
				time_bar_grid 		+= '<div 	class="calendar_time_bar" ' + 
																		'data-start_time="' + 				final_time 			+ '" ' +
																		'data-start_hour="' + 				hour_string 		+ '" ' +
																		'data-start_minute="' + 			minute_string 	+ '" ' +
																		'data-time_bar_number="' + 		i 							+ '" ' +
															'>' +
																// '<p>entity - ' + i + '</p>' + // GGG
																// I suspect this is leading to SOME of the errors. 
															'</div>';

			}

			// CLOSE THE GRIDS
			time_value_grid += '</div>'; 	// CLOSE THE DIV
			time_bar_grid += '</div>'; 		// CLOSE THE DIV

			// FLOAT ENDER
			var float_ender = '<div class="float_ender padding_static_80"></div>';

			// CREATE THE FINAL RESULT
			var day_view_html =
				'<div class="calendar_time_map">' +
					time_value_grid +
					time_bar_grid +
					time_slice_grid + 
					float_ender +
				'</div>';

			// return html;
			$('.panel.calendar .display_system .day_view_time_map').html(day_view_html);

			// highlight the time_values on the hour
			$('.panel.calendar .display_system .day_view_time_map .calendar_time_value:nth-child(4n+1)').addClass('hour');

			// Scroll to 9:00 ONLY THE FIRST TIME
			CalendarObject.DayView.scroll_to_time_bar('09:00');

		}, // END - paint_day_view_time_map

		reset_day_view : function() {
		// Gets rid of all added elements

			// Wipe all existing attributes for elements in the time map
			// Otherwise, these fuckers linger and cause problems!
				// $('.panel.calendar .display_system .calendar_time_bar p').removeAttr('data-id');

			// Clear all existing bookmarks
			CalendarObject.DayEventList.clear_event_list(); 

			// Clear up any events
			$('.panel.calendar .display_system .calendar_time_map .calendar_time_slice').remove(); 

		},

		//

		highlight_current_event : function() {
			var event_id = CalendarObject.Globals.current_event_id; 
			// Highlights the current event in the day view - for now, I use the global event for simplicity :)
			$('.panel.calendar .display_system .day_view_time_map .calendar_time_slice.selected').removeClass('selected');
			$('.panel.calendar .display_system .day_view_time_map .calendar_time_slice[data-id=' + event_id + ']').addClass('selected');
			// Highlights the preview list elements that are necessary
			$('.panel.calendar .display_system .preview_list_element').removeClass('selected');
			$('.panel.calendar .display_system .preview_list_element[data-id="' + event_id + '"]').addClass('selected'); // RRR
		},

		// 

		refresh_day_view : function(event_id) { // ROBBINS 

			// Fade in our loaders
			$('.panel.calendar .display_system .left_panel .load_overlay').show(); 
			$('.panel.calendar .display_system .mid_panel .load_overlay').show(); 

			// Clear everything before adding new elements
			CalendarObject.DayView.reset_day_view(); 

			// If the user is clicking on days of the month view, we want to switch emptily
			// BUT - if the month/day view was refreshed because the user clicked on an event, we DON'T want to clear details 
			if(event_id == undefined){
				// Clear any event details from selected events 
				CalendarObject.EventDetails.clear_existing_event_details(); 
				// Display the HELPER panel 
				CalendarObject.EventDetails.display_event_details_panel(false); 
			} else {
				CalendarObject.DayView.scroll_to_time_slice(event_id);
			}

			// collect events for this day
			var data = { 

				"action": "CALENDAR_DAY_VIEW",
				"credentials" : CREDENTIALS_OBJECT, // ALWAYS under action

				"conditions"	: {
					"user_id"				: GLOBAL_USER_ID, // 19
					"year" 					: CalendarObject.Globals.current_year,
					"month" 				: CalendarObject.Globals.current_month,
					"day" 					: CalendarObject.Globals.current_day
				}

			}

			// 

			$.post(API_PHP_URL + 'api.php', data, function(responseText){
				try {
					console.log(responseText);
					var rows = JSON.parse(responseText);

					console.log("DayView.refresh_day_view() JSON object - " , rows); 

					// ------------------------------------------------------------------------------------------
					// DAY - LABEL RELATED

					// update the day view header label (when)
					var when = rows['day_of_week'] + ', ' + rows['month_name'][2] + ' ' + rows['day'] + ', ' + rows['year'];
					$('.panel.calendar .display_system .day_header .day_label').html(when);

					CalendarObject.MonthView.highlight_current_day(); 

					// ------------------------------------------------------------------------------------------

					// Check if there are any events today
					if(rows.busy_ranges.length < 1) {
						// console.log("there are no events today!"); // RRR
						// Append the informer
						CalendarObject.DayEventList.create_day_list_informer(); 
						// Hide loader after all is loaded
						$('.panel.calendar .display_system .left_panel .load_overlay').fadeOut(FADE_OUT_SPEED); 
						$('.panel.calendar .display_system .mid_panel .load_overlay').fadeOut(FADE_OUT_SPEED); 
						// Break out of this function
						return false; 
					}

					// ------------------------------------------------------------------------------------------

					// find all busy ranges...
					var total_ranges = rows['busy_ranges'].length;
					for ( var i=0 ; i < total_ranges ; i++ ){

						// Create a re-usable pointer to the current event
						var current_event = rows['busy_ranges'][i]; 

						// Spawn a time slice with the event details
						CalendarObject.DayView.spawn_time_slice(current_event['details']); 
						// TODO : 
						// Simon really fucked up here . 
						// In a nutshell , homeboy was too lazy to PROPERLY build out the CALENDAR_DAY_VIEW function
						// So he ran a secondary SQL call for each event , and put that into a "details" variable
						// Now , we have a lot of overlap between the event details that are pulled from an event during the day view
						// And the regular "read" function. 
						// In other words...
						// Review the CALENDAR_DAY_VIEW function - particularly 'details'
						// And make it so that there is no overlap. 

						// ------------------------------------------------------------------------------------------------

						// Create an entry in the DAY VIEW event_list
						var event_list_element = CalendarObject.DayEventList.paint_event_list_element(current_event); 
						$('.panel.calendar .display_system .event_list.day').append(event_list_element); 

					} // END - for all busy ranges

					// ------------------------------------------------------------------------------------------------

					// BIND TIME SLICES
					CalendarObject.DayView.bind_all_time_slices(); 

					// BIND MONTH VIEW
					CalendarObject.MonthEventList.bind_all_event_list_elements(); 

					// BIND BOOKMARKS
					CalendarObject.DayEventList.bind_all_event_list_elements(); 

					// ------------------------------------------------------------------------------------------------
					// VISUAL CUES

					// Highlight the current event, IF the event is found on this day
					CalendarObject.DayView.highlight_current_event(); // PPP

					// Scroll to the currently selected time slice 
					if(CalendarObject.Globals.current_event_id != null){

						// Make sure that the object occurs on the current day - otherwise, don't scroll around!
						var event_object = CalendarObject.EventDetails.find_event_object(CalendarObject.Globals.current_event_id); 
						//
						if (event_object.start_day == CalendarObject.Globals.current_day){
							CalendarObject.DayView.scroll_to_time_slice(CalendarObject.Globals.current_event_id); 
						} else {
							// console.log("will NOT scroll because we're on a different day"); 
						}

					} // END - if()

					// ---------------

					// Hide loader after all is loaded
					$('.panel.calendar .display_system .left_panel .load_overlay').fadeOut(FADE_OUT_SPEED); 
					$('.panel.calendar .display_system .mid_panel .load_overlay').fadeOut(FADE_OUT_SPEED); 

				} catch(e) {
					alert("Unknown error "+ e +".");
					return;
				}

			});

		}, // END - refresh()

		//

		next_day : function() {

			// Simplify things a little bit
			var globals = CalendarObject.Globals; 
			// Get length of current month
			var current_month_length = $.code_snippets.get_month_length(globals.current_year, globals.current_month); 

			if (CalendarObject.Globals.current_day < current_month_length) {
					// We are able to add one day
					CalendarObject.Globals.current_day ++;
			}
			else { 
				// We need to move forward one month
				if (CalendarObject.Globals.current_month < 12) {
						// We are able to move forward one month
						CalendarObject.Globals.current_day = 1;
						CalendarObject.Globals.current_month += 1;
				} else {
						// We need to move forward one YEAR, because we're at the very last month
						CalendarObject.Globals.current_day = 1; 
						CalendarObject.Globals.current_month = 1;
						CalendarObject.Globals.current_year += 1;
				}
				// Either way, we need to refresh the month view
				CalendarObject.MonthView.refresh_month_view();
			}
			//console.log("current_month && ", CalendarObject.Globals.current_month); 

			// Either way, refresh the day view
			CalendarObject.DayView.refresh_day_view();

		}, 

		previous_day : function() {

			// Simplify things a little bit
			var globals = CalendarObject.Globals; 

			// Get length of the PREVIOUS month
			// When moving backward through the months, we want to figure out the month length AHEAD of time
			var previous_month_length = $.code_snippets.get_month_length(globals.current_year, globals.current_month - 1); 

			if (CalendarObject.Globals.current_day > 1) {
					// We are able to safely subtract one day
					CalendarObject.Globals.current_day -= 1;
			} 
			else {
				// We need to go back one month
				if (CalendarObject.Globals.current_month > 1) {
						// We are able to go back one month
						CalendarObject.Globals.current_day = previous_month_length;
						CalendarObject.Globals.current_month -= 1;
				} 
				else {
						// We need to go back one YEAR, because we're at the first month
						CalendarObject.Globals.current_day = 31; // December always has 31 days! :)
						CalendarObject.Globals.current_month  = 12;
						CalendarObject.Globals.current_year -= 1;
				}
				// Either way, we need to refresh the month view
				CalendarObject.MonthView.refresh_month_view();
			}
			//console.log("current_month - ", CalendarObject.Globals.current_month); 

			// Either way, refresh the day view
			CalendarObject.DayView.refresh_day_view();

		},

		// ---------------------------------------------------------------------------------------------------------
		// TIME SLICES
		//

		// VARIABLES

		is_dragging_time_slice 				: false, 
		is_resizing_time_slice 				: false, 

		clicked_time_slice_id 				: null, 	// when the user clicks on a time slice, this ID is set

		time_slice_was_dragged 				: false, 	// was the time slice that we just loaded dragged around before it was loaded?
		time_slice_was_resized 				: false, 	// was the time slice that we just loaded dragged around before it was loaded?

		drag_start_number 						: null, 
		drag_finish_number 						: null, 

		// FUNCTIONS

		reset_drag_values : function() {
			// Used to refresh values for a new drag
			CalendarObject.DayView.drag_start_number 					= null; 
			CalendarObject.DayView.drag_finish_number 				= null; 
		}, 

		paint_time_slice : function(data) { 
		// Draws a time slice to the screen. 
		// VV

			var css_height_of_time_slice 	= CalendarObject.Globals.css_height_of_time_slice; // Derived from the CSS - if you change the CSS, change this as well!
			var time_slice_sub_class 			= null;

			// 

			if(data.created_by_user){
				// event is either waiting on others, or is approved
				if(data.all_accepted){
					time_slice_sub_class = ''; // regular time slice
				} else {
					time_slice_sub_class = 'pending_others';
				}
			} else {
				// the event was created by another - it is either pending on you 
				if(data.all_accepted){
					time_slice_sub_class = ''; // regular time slice
				} else if (data.user_accepted == false) {
					time_slice_sub_class = 'pending_user'; 
				} else {
					time_slice_sub_class = 'pending_others';
				}
			}

			// 

			var time_slice = 	'<div class="calendar_time_slice ' + time_slice_sub_class 					+ '" ' + 

															'data-id="' + data.event_id + '" ' +

															'style=" 	 position:absolute; ' +
																				'top:' + data.offset_top + 'px; ' +
																				'height:' + ( data.total_slices * css_height_of_time_slice ) + 'px; ' + 
																		'"' + // ends style "" quotes

															'data-total_slices ="' 		+ data.total_slices 								+ '" ' + 

															'data-start_time ="' 			+ data.start_time 									+ '" ' + 
															'data-start_hour ="' 			+ data.start_time.substr(0, 2) 		+ '" ' + 
															'data-start_minute ="' 		+ data.start_time.substr(3, 2) 		+ '" ' + 

															'data-finish_time ="' 		+ data.finish_time 								+ '" ' + // PPP
															'data-finish_hour ="' 		+ data.finish_time.substr(0, 2) 		+ '" ' + 
															'data-finish_minute ="' 	+ data.finish_time.substr(3, 2) 		+ '" ' + 

															'data-all_accepted ="' 		+ data.all_accepted 								+ '" ' +  // BBBB - maybe we can take these out later
															'data-user_accepted ="' 	+ data.user_accepted 							+ '" ' + 

															'data-is_timematched ="' 	+ data.is_timematched 							+ '" ' + 

												'>' + 

													'<div class="timematch status_' + data.is_timematched + '"></div>' + 

													'<div class="description">' + data.description + '</div>' 			+ 		// default description
													'<div class="resize"> Resize </div>' 											+ 		// resize button

												'</div>'; 

			return time_slice; 

		},

		//

		spawn_time_slice : function (current_event) {

			// ------------------------------------------------------------------------------------------------
			// TODO - refactor this after Simon gives you a proper API return

			var event_start_time 			= current_event['start'].substr(11, 5); 
			var event_start_hour 			= event_start_time.substr(0, 2); 
			var event_start_minute 		= event_start_time.substr(3, 2); 

			var event_finish_time 		= current_event['finish'].substr(11, 5); 
			var event_finish_hour 		= event_finish_time.substr(0, 2); 
			var event_finish_minute 	= event_finish_time.substr(3, 2); 

			//

			var time_slice_data = CalendarObject.DayView.calculate_time_slice_data(		event_start_hour, 
																																								event_start_minute, 
																																								event_finish_hour, 
																																								event_finish_minute
																																		); 

			// ------------------------------------------------------------------------------------------------

			// Get the starting position of the time slice
			// Calculate the offset of the grid element at that position
			var offset = CalendarObject.DayView.calculate_time_bar_offset(time_slice_data.event_start_time);

			// ------------------------------------------------------------------------------------------------
			// Determine the acceptance of the event // BBBB

			var user_array 			= current_event['event_users']; 
			var total_users 		= user_array.length;

			var created_by_user = true; // defaults 
			if (GLOBAL_USER_ID != current_event['user_id']){ created_by_user = false; }

			var user_accepted 	= true; 
			if (current_event['accepted'] == 0){ user_accepted = false; }

			var all_accepted 		= true; 

			if (total_users > 1){
				for ( var j = 0 ; j < total_users ; j++ ){ // WARNING - if this "j" is replaced with "i" , things get FUCKED UP!
					// A single reject is all you need!
					if ( user_array[j]['accepted'] == 0 ){
						// Not everyone has accepted the event
						all_accepted = false; 
						// All we need is ONE user to satisfy our condition
						break;
					}
				} // END - for()
			} // END - if()

			// ------------------------------------------------------------------------------------------------
			// CREATE TIME SLICES

			var time_slice_data_object = {
				'event_id' 							: current_event['id'], 														// id
				'description' 					: current_event['description'], 									// description
				'offset_top' 						: offset.top, 																		// margin-top
				'total_slices' 					: time_slice_data.total_slices, 									// used for height
				'start_time' 						: time_slice_data.event_start_time,								//
				'finish_time' 					: time_slice_data.event_finish_time,							//
				'created_by_user' 			: created_by_user, 																// 000 
				'user_accepted' 				: user_accepted, 																	// 
				'all_accepted' 					: all_accepted, 																	// comment here 
				'is_timematched' 				: current_event['is_timematched']
			}; 

			var time_slice = CalendarObject.DayView.paint_time_slice(time_slice_data_object); 

			// Append the time slice to the screen 
			$('.panel.calendar .display_system .calendar_time_map .calendar_time_slice_grid').append(time_slice); 

		}, // END - spawn_time_slice(); 

		//

		redraw_time_slice : function(event_id) {

			// If a time slice is resized locally , we want to redraw it on the screen. 

			// THEORY : 
			// Find the event object
			// Remove the time slice from the screen
			// Call "paint_time_slice()" with details from the event object 

			var event_object = CalendarObject.EventDetails.find_event_object(event_id);

			// Remove the event from the screen. 
			$('.panel.calendar .display_system .calendar_time_map .calendar_time_slice[data-id="' + event_id + '"]').remove();

			// Redraw the event to the screen. 
			CalendarObject.DayView.spawn_time_slice(event_object); 

			// BIND TIME SLICES
			CalendarObject.DayView.bind_all_time_slices(); 

			// Highlight the current event, IF the event is found on this day
			CalendarObject.DayView.highlight_current_event(); // PPP

		}, 

		//

		create_new_time_slice : function() {
		// Creates a new time slice when the user clicks on a blank section of the screen

			//var 

		},

		// 

		calculate_time_slice_data : function( event_start_hour, event_start_minute, event_finish_hour, event_finish_minute ){
			// Calculate the total number of time slices that an event takes up
			// Returns an object that contains the total slices, and the final time
			console.log("called - calculate_time_slice_data"); 

			// Calculate total slices
			var event_start_slices = (event_start_hour * 4) + (event_start_minute / 15); 
			// console.log(event_start_slices); 

			var event_finish_slices = (event_finish_hour * 4) + (event_finish_minute / 15); 
			// console.log(event_finish_slices); 

			var total_slices = event_finish_slices - event_start_slices; 
			// console.log("total slices = " , total_slices); 

			// Format the START time
			if( event_start_hour == 0 ) { // PPP - changed from === to == 
				event_start_hour = "00";
			}
			else if ( event_start_hour < 10 ) {
				// Simon inconsistency - sometimes I'm fed "03", other times I'm fed "3"
				if( typeof event_start_hour == "string"){
					event_start_hour = "0" + event_start_hour.substr(1, 1);
				} else {
					event_start_hour = "0" + event_start_hour; 
				}
			}
			if( event_start_minute == 0 ) { event_start_minute = "00" }
			var event_start_time 		= event_start_hour + ":" + event_start_minute; 
			//

			// Format the FINISH time
			if( event_finish_hour == 0 ) { 
				event_finish_hour = "00";
			}
			else if ( event_finish_hour < 10 ) {
				// Simon inconsistency - sometimes I'm fed "03", other times I'm fed "3"
				if( typeof event_finish_hour == "string"){
					event_finish_hour = "0" + event_finish_hour.substr(1, 1);
				} else {
					event_finish_hour = "0" + event_finish_hour; 
				}
			}
			if( event_finish_hour == 0 ) { event_finish_hour = "00" }
			var event_finish_time 		= event_finish_hour + ":" + event_finish_minute; 
			//

			// Create return object
			var return_object = new Object(); 
					return_object.total_slices 				= total_slices;
					return_object.event_start_time 		= event_start_time; 
					return_object.event_finish_time 	= event_finish_time; 

			// Return
			return return_object; 

		}, 

		calculate_time_bar_offset : function(target_time) {
			// Calculate the offset of the grid element at the specified time

			// Find the time_bar whose time corresponds to the target_time
			var offset = $('.panel.calendar .display_system .calendar_time_bar[data-start_time="' + target_time + '"]').position(); 
			// console.log("the offset is - ", offset); 

			// If the offset is null, it probably means that this event starts and ends at 00:00 
			if(offset == null) { 
				offset = { top : 0 }; 
				console.log("offset is null. event_start_time is - ", target_time); 
			}

			return offset; 

		},

		scroll_to_time_bar : function(target_time) {

			var offset = CalendarObject.DayView.calculate_time_bar_offset(target_time); 

			// Scroll the window to the right place
			$('.panel.calendar .display_system .calendar_time_map').animate(
				{scrollTop : offset.top },
				'normal'
			);

		}, 

		scroll_to_time_slice : function(event_id){

				// Get the target offset
				var offset = $('.panel.calendar .display_system .calendar_time_slice[data-id="' + event_id + '"]').position(); 
				console.log("the offset is - ", offset); 

				// Temporary bug fixin'
				if(offset == null) { 
					offset = { top : 0 }; 
				}

				// Scroll the window to the right place
				$('.panel.calendar .display_system .calendar_time_map').animate(
					{scrollTop : offset.top },
					'normal'
				);

		},

		// 

		bind_buttons: function() {

			// NEXT DAY
			$('.panel.calendar .day_view_next_button').unbind();
			$('.panel.calendar .day_view_next_button').bind('tap click', function(event){
				CalendarObject.DayView.next_day();
			});

			// PREVIOUS DAY
			$('.panel.calendar .day_view_prev_button').unbind();
			$('.panel.calendar .day_view_prev_button').bind('tap click', function(event){
				CalendarObject.DayView.previous_day();
			});

		},

		// 

		bind_all_time_bars : function() { 

			// UNBIND
			$('.panel.calendar .display_system .calendar_time_bar').unbind();

			// MOUSE OVER
			$('.panel.calendar .display_system .calendar_time_map .calendar_time_bar').bind('mouseover', function(event) {

				// -----------------------------------------------------------------------------------------------
				// CLEAR TEXT SELECTION

				// window.getSelection().removeAllRanges();
				$.code_snippets.clear_selection(); // more cross-brower friendly

				// In the past, I tried using this solution : 
					// DISABLE TEXT SELECTION - PART II
					// $('.panel.calendar .display_system').disableSelection();
				// The results weren't effective (would only kick in AFTER the first time you dragged a time slice)
				// Additionally, this caused further problems with dragging - would fuck up some dragging 

				// -----------------------------------------------------------------------------------------------

				// Time of the time bar that we are currently hovering over
				var time_bar_time 	= $(event.currentTarget).attr('data-start_time'); 
				console.log(time_bar_time); 

				// Shortcut to current event
				var event_id 				= CalendarObject.DayView.clicked_time_slice_id; 

				//
				// XXXX = we'll put this in a function later

				if(event_id == 0){

					// Only create the element ONCE!
					if( $('.panel.calendar .display_system .calendar_time_map .calendar_time_slice[data-id="0"]').length == 0 ){

						// TODO : 
						// Destroy any other new slices that may be present
						// $('.panel.calendar .display_system .calendar_time_map .calendar_time_slice[data-id="0"]').remove(); // MOSTLY, THIS IS A BUG CHECKER
	
						// We need to create a new time slice
						var offset = CalendarObject.DayView.calculate_time_bar_offset(time_bar_time);

						// QQ
						var time_slice_data_object = {
							'event_id' 							: 0, 								// id
							'description' 					: "NEW_EVENT", 			// description
							'offset_top' 						: offset.top, 			// margin-top
							'total_slices' 					: 0, 								// used for height
							'start_time' 						: time_bar_time, 		// get time of event
							'finish_time' 					: time_bar_time, 		// start and finish are the same, at first
							'created_by_user' 			: true, 						// created_by_user ? obviously true
							'user_accepted' 				: true, 						// accepted_by_user ? again, yes
							'all_accepted' 					: true, 						// all_accepted ? by default, set to false 
							'is_timematched' 				: 0 								// is_timematched ? FALSE - obviously
						}; 

						var time_slice = CalendarObject.DayView.paint_time_slice(time_slice_data_object); 

						$('.panel.calendar .display_system .calendar_time_map .calendar_time_slice_grid').append(time_slice); 

					}

				}

				//

				// Shortcut to current time slice
				var current_time_slice = $('.panel.calendar .display_system .calendar_time_map .calendar_time_slice[data-id="' + event_id + '"]');
				// console.log(current_time_slice); 

				// --------------------------------------------------------------------------------------------------------------------------------------------

				if(CalendarObject.DayView.is_dragging_time_slice) {
					// console.log("WE ARE DRAGGING THE TIME SLICE"); 

					// Dragging the time slice will parse the start and finish times of the time slice that the user clicked on
					// It will then calculate if the user is dragging up, down, or not at all
					// Based on the change, it will move the time slice up / down / none
					// Finally, the function updates the attributes of the time slice to match the new position
					// All of this happens every cycle of the mouse over event

					// Set the start drag number
					if(CalendarObject.DayView.drag_start_number != null) {
						console.log("drag_start_number has already been set"); 
					}
					else {
						console.log("setting drag_start_number for the first time"); 
						CalendarObject.DayView.drag_start_number 		= $(event.currentTarget).attr('data-time_bar_number'); 
					}

					// ------------------------------------------------------------------------------------------------
					// Find the time bars that correspond to the starting and ending points of our time slice

					var time_bar_at_start_time 		= $('.panel.calendar .display_system .calendar_time_bar[data-start_time="' 	+ current_time_slice.attr('data-start_time') 		+ '"]'); 
					var time_bar_at_finish_time 	= $('.panel.calendar .display_system .calendar_time_bar[data-start_time="' 	+ current_time_slice.attr('data-finish_time') 	+ '"]'); 

					// ------------------------------------------------------------------------------------------------
					// Determine if the user is dragging up or down
					var drag_start 		= parseInt( CalendarObject.DayView.drag_start_number 						);
					var drag_finish 	= parseInt( $(event.currentTarget).attr('data-time_bar_number') );

					// Default to stay in the same place
					var next_start_time_bar 			= time_bar_at_start_time; 
					var next_finish_time_bar 			= time_bar_at_finish_time;

					// Check for differences
					if (drag_start < drag_finish ){
						//console.log("moving time slice up"); 
						next_start_time_bar 				= time_bar_at_start_time.next(); 
						next_finish_time_bar 				= time_bar_at_finish_time.next(); 
						var change = true; 
					} 
					else if (drag_start > drag_finish ){
						//console.log("moving time slice down"); 
						next_start_time_bar 				= time_bar_at_start_time.prev(); 
						next_finish_time_bar 				= time_bar_at_finish_time.prev(); 
						var change = true; 
					}
					else {
						// console.log("not moving up or down"); 
						var change = false; 
					}

					// TODO - 
					// Include a fail-safe so that the user does not drag up to BEFORE 00:00, or AFTER 23:45

					// ------------------------------------------------------------------------------------------------
					// Now that we know what the next_start_time_bar is, we will line up the time slice with that time bar

					if(change) {

						// console.log("next_start_time_bar - ", next_start_time_bar); 

						var offset = next_start_time_bar.position(); 
						//console.log("the offset is - ", offset); 

						// If the offset is null, it probably means that this event starts and ends at 00:00 
						if(offset == null) { 
							offset = { top : 0 }; 
							console.log("SOMETHING HAS FAILED"); 
							console.log("offset is null. event_start_time is - ", (next_start_time_bar).attr('data-start_time') ); 
							return false; 
						}

						// Move the time slice
						current_time_slice.css( 'top' , (offset.top + 'px') ); 

						// ------------------------------------------------------------------------------------------------
						// CRITICAL - Update our drag_start_number, so that our relative position changes
						CalendarObject.DayView.drag_start_number 		= $(event.currentTarget).attr('data-time_bar_number'); 

						// ------------------------------------------------------------------------------------------------
						// Update the TIME SLICE

						current_time_slice.attr('data-start_time', 				next_start_time_bar.attr('data-start_time') 		); 
						current_time_slice.attr('data-start_hour', 				next_start_time_bar.attr('data-start_hour') 		); 
						current_time_slice.attr('data-start_minute', 			next_start_time_bar.attr('data-start_minute') 	); 

						current_time_slice.attr('data-finish_time', 			next_finish_time_bar.attr('data-start_time') 		); 
						current_time_slice.attr('data-finish_hour', 			next_finish_time_bar.attr('data-start_hour') 		); 
						current_time_slice.attr('data-finish_minute', 		next_finish_time_bar.attr('data-start_minute') 	); 

					}

					// ------------------------------------------------------------------------------------------------
					// Inform the system that the time slice has been dragged / clicked on
					CalendarObject.DayView.time_slice_was_dragged = true; 


				} // END - USER IS DRAGGING AN EXISTING TIME SLICE

				// --------------------------------------------------------------------------------------------------------------------------------------------

				else if(CalendarObject.DayView.is_resizing_time_slice) {
					// console.log("WE ARE DRAGGING THE TIME SLICE"); 

					// Set the start drag number
					if(CalendarObject.DayView.drag_start_number != null) {
						console.log("drag_start_number has already been set"); 
					}
					else {
						console.log("setting drag_start_number for the first time"); 
						CalendarObject.DayView.drag_start_number 		= $(event.currentTarget).attr('data-time_bar_number'); 
					}

					// ------------------------------------------------------------------------------------------------
					// Find the time bars that correspond to the starting and ending points of our time slice

					var time_bar_at_start_time 		= $('.panel.calendar .display_system .calendar_time_bar[data-start_time="' 	+ current_time_slice.attr('data-start_time') 		+ '"]'); 
					var time_bar_at_finish_time 	= $('.panel.calendar .display_system .calendar_time_bar[data-start_time="' 	+ current_time_slice.attr('data-finish_time') 	+ '"]'); 

					var total_time_slices 				= current_time_slice.attr('data-total_slices');

					// ------------------------------------------------------------------------------------------------
					// Determine if the user is dragging up or down
					var drag_start 		= parseInt( CalendarObject.DayView.drag_start_number 						);
					var drag_finish 	= parseInt( $(event.currentTarget).attr('data-time_bar_number') );

					console.log("START - " , drag_start , " || CURRENT - " , drag_finish ); 

					// Default to stay in the same place
					var next_start_time_bar 			= time_bar_at_start_time; 
					var next_finish_time_bar 			= time_bar_at_finish_time;

					// Check for differences
					if (drag_start < drag_finish ){
						//
						next_finish_time_bar 				= time_bar_at_finish_time.next(); 
						// 
						total_time_slices ++;
						var change = true; 

					} 
					else if ( drag_start > drag_finish ){

						console.log(CalendarObject.DayView.drag_start_number , " is GREATER than " , $(event.currentTarget).attr('data-time_bar_number') ); 

						next_finish_time_bar 				= time_bar_at_finish_time.prev(); 
						//
						total_time_slices --;

						// Make sure that the user is not dragging up!
						if(total_time_slices < 0){
							// 
							total_time_slices 		= 0;
							next_start_time_bar 	= time_bar_at_start_time.prev(); 
						}
						//
						var change = true; 
					}
					else {
						var change = false; 
					}

					// ------------------------------------------------------------------------------------------------
					// Now that we know what the next_start_time_bar is, we will line up the time slice with that time bar

					if(change) {

						// ------------------------------------------------------------------------------------------------
						// HEIGHT 
						current_time_slice.css( 'height' , ( (total_time_slices * CalendarObject.Globals.css_height_of_time_slice) + 'px') ); 

						// ------------------------------------------------------------------------------------------------
						// POSITION
						var offset = next_start_time_bar.position(); 
						//console.log("the offset is - ", offset); 

						// If the offset is null, it probably means that this event starts and ends at 00:00 
						if(offset == null) { 
							offset = { top : 0 }; 
							console.log("SOMETHING HAS FAILED"); 
							console.log("offset is null. event_start_time is - ", (next_start_time_bar).attr('data-start_time') ); 
							return false; 
						}

						// Move the time slice
						current_time_slice.css( 'top' , (offset.top + 'px') ); 

						// ------------------------------------------------------------------------------------------------
						// CRITICAL - Update our drag_start_number, so that our relative position changes
						CalendarObject.DayView.drag_start_number 		= $(event.currentTarget).attr('data-time_bar_number'); 

						// ------------------------------------------------------------------------------------------------
						// Update the TIME SLICE

						current_time_slice.attr('data-start_time', 				next_start_time_bar.attr('data-start_time') 		); 
						current_time_slice.attr('data-start_hour', 				next_start_time_bar.attr('data-start_hour') 		); 
						current_time_slice.attr('data-start_minute', 			next_start_time_bar.attr('data-start_minute') 	); 

						current_time_slice.attr('data-finish_time', 			next_finish_time_bar.attr('data-start_time') 		); 
						current_time_slice.attr('data-finish_hour', 			next_finish_time_bar.attr('data-start_hour') 		); 
						current_time_slice.attr('data-finish_minute', 		next_finish_time_bar.attr('data-start_minute') 	); 

						current_time_slice.attr('data-total_slices', 		total_time_slices 	); 

					}

					// ------------------------------------------------------------------------------------------------
					// Inform the system that the time slice has been dragged / clicked on
					CalendarObject.DayView.time_slice_was_resized = true; 

				} // END - USER IS RESIZING AN EXISTING TIME SLICE

				// --------------------------------------------------------------------------------------------------------------------------------------------

				else {

					// Set the start drag number
					if(CalendarObject.DayView.drag_start_number != null) {
						console.log("drag_start_number has already been set"); 
					}
					else {
						console.log("setting drag_start_number for the first time"); 
						CalendarObject.DayView.drag_start_number 		= $(event.currentTarget).attr('data-time_bar_number'); 
					}

					// ------------------------------------------------------------------------------------------------
					// Find the time bars that correspond to the starting and ending points of our time slice

					var time_bar_at_start_time 		= $('.panel.calendar .display_system .calendar_time_bar[data-start_time="' 	+ current_time_slice.attr('data-start_time') 		+ '"]'); 
					var time_bar_at_finish_time 	= $('.panel.calendar .display_system .calendar_time_bar[data-start_time="' 	+ current_time_slice.attr('data-finish_time') 	+ '"]'); 

					var total_time_slices 				= current_time_slice.attr('data-total_slices');

					// ------------------------------------------------------------------------------------------------
					// Determine if the user is dragging up or down
					var drag_start 		= parseInt( CalendarObject.DayView.drag_start_number 						);
					var drag_finish 	= parseInt( $(event.currentTarget).attr('data-time_bar_number') );

					console.log("START - " , drag_start , " || CURRENT - " , drag_finish ); 

					// Default to stay in the same place
					var next_start_time_bar 			= time_bar_at_start_time; 
					var next_finish_time_bar 			= time_bar_at_finish_time;

					// Check for differences
					if (drag_start < drag_finish ){
						//
						next_finish_time_bar 				= time_bar_at_finish_time.next(); 
						// 
						total_time_slices ++;
						var change = true; 

					} 
					else if ( drag_start > drag_finish ){

						console.log(CalendarObject.DayView.drag_start_number , " is GREATER than " , $(event.currentTarget).attr('data-time_bar_number') ); 

						next_finish_time_bar 				= time_bar_at_finish_time.prev(); 
						//
						total_time_slices --;

						// Make sure that the user is not dragging up!
						if(total_time_slices < 0){
							// 
							total_time_slices 		= 0;
							next_start_time_bar 	= time_bar_at_start_time.prev(); 
						}
						//
						var change = true; 
					}
					else {
						var change = false; 
					}

					// ------------------------------------------------------------------------------------------------
					// Now that we know what the next_start_time_bar is, we will line up the time slice with that time bar

					if(change) {

						// ------------------------------------------------------------------------------------------------
						// HEIGHT 
						current_time_slice.css( 'height' , ( (total_time_slices * CalendarObject.Globals.css_height_of_time_slice) + 'px') ); 

						// ------------------------------------------------------------------------------------------------
						// POSITION
						var offset = next_start_time_bar.position(); 
						//console.log("the offset is - ", offset); 

						// If the offset is null, it probably means that this event starts and ends at 00:00 
						if(offset == null) { 
							offset = { top : 0 }; 
							console.log("SOMETHING HAS FAILED"); 
							console.log("offset is null. event_start_time is - ", (next_start_time_bar).attr('data-start_time') ); 
							return false; 
						}

						// Move the time slice
						current_time_slice.css( 'top' , (offset.top + 'px') ); 

						// ------------------------------------------------------------------------------------------------
						// CRITICAL - Update our drag_start_number, so that our relative position changes
						CalendarObject.DayView.drag_start_number 		= $(event.currentTarget).attr('data-time_bar_number'); 

						// ------------------------------------------------------------------------------------------------
						// Update the TIME SLICE

						current_time_slice.attr('data-start_time', 				next_start_time_bar.attr('data-start_time') 		); 
						current_time_slice.attr('data-start_hour', 				next_start_time_bar.attr('data-start_hour') 		); 
						current_time_slice.attr('data-start_minute', 			next_start_time_bar.attr('data-start_minute') 	); 

						current_time_slice.attr('data-finish_time', 			next_finish_time_bar.attr('data-start_time') 		); 
						current_time_slice.attr('data-finish_hour', 			next_finish_time_bar.attr('data-start_hour') 		); 
						current_time_slice.attr('data-finish_minute', 		next_finish_time_bar.attr('data-start_minute') 	); 

						current_time_slice.attr('data-total_slices', 			total_time_slices 	); 

					}

					// ------------------------------------------------------------------------------------------------
					// Inform the system that the time slice has been dragged / clicked on
					CalendarObject.DayView.time_slice_was_created = true; 

				} // END - USER IS CREATING A NEW TIME SLICE

				// --------------------------------------------------------------------------------------------------------------------------------------------

			}); // END - MOUSE OVER


			// MOUSE UP

			$('.panel.calendar .display_system .calendar_time_map .calendar_time_bar_grid').bind('mouseup', function(event) { /*.calendar_time_bar*/

				console.log("mouseup"); 

				// The user was dragging a time slice, so we want to affect the properties of that time slice
				var event_id = CalendarObject.DayView.clicked_time_slice_id; 

				// -------------------------------------------------------------------------------
				// Double-check if the event is time-matched

				var current_time_slice = $('.panel.calendar .display_system .calendar_time_map .calendar_time_slice[data-id="' + event_id + '"]');

				if( current_time_slice.attr('data-is_timematched') == 1 ){

					// Prompt the user. 
					var confirm_window = confirm("You have moved a time-matched event. It may no longer be synched up with the schedules of everyone involved. Press okay to continue or cancel to reset"); 

					if (confirm_window == false) {
						// Refresh the day view to reset any changes made
						CalendarObject.DayView.refresh_day_view(); // QWERTY
						// Return the time_bar_grid to its regular z-index
						$('.panel.calendar .display_system .calendar_time_map .calendar_time_bar_grid').css('z-index', '0'); 
						// Break out of the function
						return false;
					} 
					else if (confirm_window == true) {
						// could do something else here. 
					} 

				} // END - Double-check if the event is time-matched
				// -------------------------------------------------------------------------------


				// DRAG + MOVE TIME SLICE
				if(CalendarObject.DayView.is_dragging_time_slice){

					// Load the event in question
					// CalendarObject.EventDetails.load_event_details(event_id); // UUU
					CalendarObject.EventDetails.switch_to_event_from_click(event_id, false); 

				} // END - if (CalendarObject.DayView.is_dragging_time_slice)

				else if (CalendarObject.DayView.is_resizing_time_slice){

					// Load the event in question
					// CalendarObject.EventDetails.load_event_details(event_id); // UUU
					CalendarObject.EventDetails.switch_to_event_from_click(event_id, false); 

				}

				else {

					// GGGG

					// If the user does a fast tap, the data-start_time is not set (undefined)
					// We need to think of a way to fix this... so we will try the following : 

					// Check for random fucked up stuff - like the user clicking SO fast that a drag does not register
					var new_time_slice_exists 	= $('.panel.calendar .display_system .calendar_time_map .calendar_time_slice[data-id="0"]');
					if (new_time_slice_exists.length == 0){
						console.log("failed"); 
						return false; 
					} 

					console.log ("worked"); 

					// Trigger the creation of a new event
					CalendarObject.Navigation.switch_to_system("new_event");
					CalendarObject.NewEvent.new_event_from_drag(); 

				}

				// EITHER WAY : Return the time_bar_grid to its regular z-index
				$('.panel.calendar .display_system .calendar_time_map .calendar_time_bar_grid').css('z-index', '0'); 

			}); // END - MOUSE UP

		}, // END - bind_all_time_bars

		//

		// TODO - 
		// Consider breaking out the functionality of these mouse events and turning them into functions... 

		bind_all_time_slices : function() {

			// UNBIND
			$('.panel.calendar .display_system .calendar_time_map .calendar_time_slice').unbind();

			// MOUSE DOWN
			$('.panel.calendar .display_system .calendar_time_map .calendar_time_slice').bind('mousedown', function(event) {

				// Prevent any other events from taking place - THIS IS CRITICALLY IMPORTANT!!
				event.stopPropagation(); 

				// Check if the event is time-matched
				/*
				if( $(this).attr('data-is_timematched') == 1 ){
					alert("You cannot alter a time-matched event!");
					return false; // QWERTY
				}
				*/

				// Prepare the time slice to have its details loaded
				var event_id = $(this).attr('data-id'); 
				CalendarObject.DayView.clicked_time_slice_id = event_id;

				// Auto-save the previously selected event - before we move on to the "current" event
				if (event_id != CalendarObject.Globals.current_event_id) {
					CalendarObject.EventDetails.auto_save(CalendarObject.Globals.current_event_id); // GGX
				}

				// Prepare the time slice for potential dragging
				CalendarObject.DayView.is_dragging_time_slice = true; 

				// Reset drag values // CRITICALLY IMPORTANT!
				CalendarObject.DayView.reset_drag_values(); 

				// Layer the time grid over the time slices, so that we can drag successfully 
				$('.panel.calendar .display_system .calendar_time_map .calendar_time_bar_grid').css('z-index', '1000'); 

			});



			// RESIZE BUTTON
			$('.panel.calendar .display_system .calendar_time_map .calendar_time_slice .resize').bind('mousedown', function(event) {

				// Prevent any other events from taking place - THIS IS CRITICALLY IMPORTANT!!
				event.stopPropagation(); 

				// DISABLE TEXT SELECTION - PART IV
					// $('html').disableSelection();

				// Auto-save the previously selected event - before we move on to the "current" event
				if (event_id != CalendarObject.Globals.current_event_id) {
					CalendarObject.EventDetails.auto_save(CalendarObject.Globals.current_event_id); // GGX
				}

				// Prepare the time slice to have its details loaded
				var event_id = $(this).parent().attr('data-id'); // IMPORTANT - PARENT ELEMENT
				CalendarObject.DayView.clicked_time_slice_id = event_id;

				// Prepare the time slice for potential dragging
				CalendarObject.DayView.is_resizing_time_slice = true; 

				// Reset drag values // CRITICALLY IMPORTANT!
				CalendarObject.DayView.reset_drag_values(); 

				// Layer the time grid over the time slices, so that we can drag successfully 
				$('.panel.calendar .display_system .calendar_time_map .calendar_time_bar_grid').css('z-index', '1000'); 

			});

			// DISABLE TEXT SELECTION
			// Fixes some bugs - sometimes the text selection drag will override MY drag events. 
			// That makes me VERY angry!
			$('.panel.calendar .display_system .calendar_time_map .calendar_time_slice').disableSelection();

/*
			// MOUSE DOWN
			$('.panel.calendar .display_system .calendar_time_map .calendar_time_slice').bind('mousedown', function(event) {
				console.log("the mouse is down on a time slice"); 

				// ----------------------------------------------------------------------------------------------------

				// We trigger the auto_save when the mouse is down, BEFORE we load the new event id
				// It is possible for the user to drag events that are not loaded. 
				// For example, view the event details for event X, then drag event Y and not lift the mouse up
				// So we want to save event X the second the user clicks down on another event, 
				// BEFORE we load the new event
				// Otherwise, we would auto_save values of the dragged event into the PREVIOUS event!
				// Savvy?

				if(event_id != CalendarObject.Globals.current_event_id){
					console.log("You have decided to switch events"); 
					// Auto-save
					CalendarObject.EventDetails.auto_save();
				}

			});

			// RESIZE BUTTON
			$('.panel.calendar .display_system .calendar_time_map .calendar_time_slice .resize').bind('mousedown', function(event) {

				// Determine whether or not to auto-save
				if(event_id != CalendarObject.Globals.current_event_id){
					console.log("You have decided to switch events"); 
					// Auto-save
					CalendarObject.EventDetails.auto_save();
				}
				//

			});

*/

		},

		// 

		bind_time_slice_grid : function() {
			// The user clicks on an empty area of the time slice grid , NOT on a time slice

			// UNBIND
			$('.panel.calendar .display_system .calendar_time_map .calendar_time_slice_grid').unbind();

			// MOUSE DOWN 
			$('.panel.calendar .display_system .calendar_time_map .calendar_time_slice_grid').bind('mousedown', function(event){
				console.log("mouse is down on the time slice GRID, and NOT a time slice"); 

				// TODO : 
				// Would I need - event.stopPropagation(); - in here?

				// Reset any variables from a potential previous drag
				CalendarObject.DayView.reset_drag_values(); 

				// We aren't clicking on any time slice
				CalendarObject.DayView.clicked_time_slice_id = 0; 

				// Ensure that the user is not dragging or scaling
				CalendarObject.DayView.is_resizing_time_slice = false;
				CalendarObject.DayView.is_dragging_time_slice = false;

				// Layer the time grid over the time slices, so that we can drag without other mouse handlers overriding this 
				$('.panel.calendar .display_system .calendar_time_map .calendar_time_bar_grid').css('z-index', '1000'); 

			});

		}, 

		//

		initialize : function() {
			CalendarObject.DayView.create_day_view(); 
			CalendarObject.DayView.refresh_day_view();
			CalendarObject.DayView.bind_buttons(); 
			CalendarObject.DayView.bind_all_time_bars(); 
			CalendarObject.DayView.bind_time_slice_grid(); 
			// 
			//CalendarObject.DayView.bind_all_time_slices(); // is called in other functions
		}


	}; // END - CalendarObject.DayView



	CalendarObject.MonthEventList = {
	// List of events present in the current month

		// THE LIST OF EVENTS FOR THE SELECTED DATE
		paint_event_list_element: function(event) {

			// MONTH GRID VIEW ELEMENT ----------------- // NNNN

			// var start_day = parseInt( event['details']['start_day'] ); // TODO - FIX THIS ! 
			var start_day = event['start'].substr(8, 2);

			// Check to see if the event currently exists
			var event_already_exists_in_dom = jQuery.inArray( start_day, CalendarObject.MonthView.array_of_days_with_events );

			if(event_already_exists_in_dom != -1){
				// don't need to push to the array
			} else {
				// console.log("pushing to array"); 
				CalendarObject.MonthView.array_of_days_with_events.push(start_day); 
			}

			// LIST ELEMENT -----------------
			//
			var html =	'<div class="preview_list_element" data-id="' + event['id'] + '" >' + 
										'<div class="description">' +
											event['description'] + 
										'</div>' + 
									'</div>';
			//
			return html;
		},

		paint_event_list : function(data) {

			console.log("called - paint_event_list - "); 

			// Reset the array of days with events in them 
			CalendarObject.MonthView.array_of_days_with_events.length = 0; 

			//
			var html_event_list = '';
			var html_clear_float = '<div class="float_ender padding_static_80"></div>';
			
			if (data != undefined)
			{
				for (var i = 0; i < data.length; i+=1 )
				{
					// console.log(data[i]);
					html_event_list += CalendarObject.MonthEventList.paint_event_list_element(data[i])
				}
			}
			
			var html =
				//'<div class="calendar_event_block">' +
					html_event_list; //+
					//html_clear_float +
				//'</div>';
				
			return html;
			
		},

		// 

		create_event_dom_elements : function() {

			var new_list_element =	'<div class="preview_list_element selected new_event_element">' + 
																'<div class="description">' +
																	'[ NEW EVENT ]' + 
																'</div>' + 
															'</div>';

			// Add to the month view event list
			$('.panel.calendar .display_system .event_list.month').prepend(new_list_element);

			// Add to the day view event list
			$('.panel.calendar .display_system .event_list.day').prepend(new_list_element);
			//
		},

		destroy_event_dom_elements : function(event_id) {
			$('.panel.calendar .display_system').find('*[data-id="' + event_id + '"]').remove(); 
		},

		//

		bind_all_event_list_elements : function() {
			//
			$('.panel.calendar .display_system .event_list.month .preview_list_element').unbind();
			$('.panel.calendar .display_system .event_list.month .preview_list_element').bind('tap click', function(click_event){
				var event_id = $(click_event.currentTarget).attr('data-id');
				CalendarObject.EventDetails.switch_to_event_from_click(event_id, true); 
			});
		}, 

		//

		initialize: function() {
			CalendarObject.MonthEventList.bind_all_event_list_elements();
		}

		//

	}; // END - CalendarObject.MonthEventList



	CalendarObject.DayEventList = {
	// List of events present in the current day

		// THE LIST OF EVENTS FOR THE SELECTED DATE
		paint_event_list_element : function(event) {

			// Check to see if this is a pending event
			user_accepted = ''; 
			if (event['accepted'] == 0){ user_accepted = 'pending_user'; }

			//
			var html =	'<div class="preview_list_element ' + user_accepted + '" ' +
										'data-id="' + event['id'] + '" ' + 
									'>' + 
										'<div class="description">' +
											event['description'] + 
										'</div>' + 
									'</div>';
			//
			return html;
		},

		paint_event_list: function(data) {
			//
			var html_event_list = '';
			var html_clear_float = '<div class="float_ender padding_static_80"></div>';
			
			if (data != undefined)
			{
				for (var i=0; i<data.length; i++)
				{
					console.log(data[i]);
					html_event_list += CalendarObject.DayEventList.paint_event_list_element(data[i]);
				}
			}
			
			var html =
				//'<div class="calendar_event_block">' +
					html_event_list; //+
					//html_clear_float +
				//'</div>';
				
			return html;
			
		},

		clear_event_list : function() {
			$('.panel.calendar .display_system .event_list.day .preview_list_element').remove(); 
			CalendarObject.DayEventList.remove_all_day_list_informers(); 
			// Empty anything else that may be in the bookmarks block - AFTER we remove any elements - for the sake of memory leaks
			$('.panel.calendar .display_system .event_list.day').html(""); // RRR
		}, 

		// 

		create_event_dom_elements: function() {
			// Create a new task element in the sideBar
			// Different from PAINT, which simply returns HTML
			var new_list_element = '<div class="preview_list_element new_event_element">[ NEW EVENT ]</div>';
			$('.panel.calendar .display_system .event_list.day').prepend(new_list_element);
		},

		destroy_event_dom_elements: function(event_id) {
			var selector = 	$('.panel.calendar .event_list.day ' + 
												'.preview_list_element[data-id=' + event_id + ']');
			$(selector).remove();
		},

		// INFINF

		create_day_list_informer : function() { 

			// Remove any informer that may exist 
			CalendarObject.DayEventList.remove_all_day_list_informers(); // ROBBINS 

			// Create day list informer
			var inform = '<div class="inform">You have no events on this day.<br/>Click to create one!</div>';
			// Append it to the day event list
			$('.panel.calendar .display_system .event_list.day').append(inform); 
			// Bind it
			CalendarObject.DayEventList.bind_all_day_list_informers(); 
		}, 

		remove_all_day_list_informers : function() {
			// Clean up after ourselves
			$('.panel.calendar .display_system .event_list.day .inform').remove(); 
		}, 

		bind_all_day_list_informers : function() {
			$('.panel.calendar .display_system .event_list.day .inform').unbind();
			$('.panel.calendar .display_system .event_list.day .inform').bind('tap click', function(click_event){
				CalendarObject.Navigation.switch_to_system("new_event");
				CalendarObject.NewEvent.new_event(); 
			});
		}, 

		//

		bind_all_event_list_elements: function() {
			// DAY LIST
			$('.panel.calendar .display_system .event_list.day .preview_list_element').unbind();
			$('.panel.calendar .display_system .event_list.day .preview_list_element').bind('tap click', function(click_event){
				var event_id = $(click_event.currentTarget).attr('data-id');
				CalendarObject.EventDetails.switch_to_event_from_click(event_id, true); 
			});

		}, 

		//

		initialize: function() {
			CalendarObject.DayEventList.bind_all_event_list_elements();
		}

		//

	}; // END - CalendarObject.DayEventList



	CalendarObject.PendingEventList = {

		// TODO : 
		// This needs to affect the loading animations as well ; for now I'm skipping it because there are more important things to figure out!

		refresh_pending_event_list : function() {

			var data = {
				"action" 											: "FIND_NEW_RECEIVED_EVENTS",
				"credentials" 								: CREDENTIALS_OBJECT, // user authentication
				"last_received_event_id" 			: PushObject.Test.latest_id_for_received_event // 0 // - default value
			}
			console.log(data);

			$.post(API_PHP_URL + 'api.php', data, function(responseText){
				try {

					// console.log(responseText);
					var new_events = JSON.parse(responseText); 
					console.log(new_events); 

					// SQI
					console.log("User has - " , new_events.length , " - pending events!"); 
					if ( new_events.length > 0 ) { 
						// Remove any potential informers
						CalendarObject.PendingEventList.remove_pending_list_informer(); 
						// Add an alert to the event_list_header tab
						$('.panel.calendar .display_system .event_list_header .tab[data-event_list="pending"]').addClass('alert');
					} 
					else {
						// If no pending events remain, create an informer
						CalendarObject.PendingEventList.create_pending_list_informer(); 
						// Remove the alert class
						$('.panel.calendar .display_system .event_list_header .tab[data-event_list="pending"]').removeClass('alert');
						// Don't need to continue down the function
						return false; 
					}

					// Clear any pending events that may be here
					// TODO : Maybe we don't have to do this... if we refresh the list properly, or check for duplicates 
						// $('.panel.calendar .display_system .event_list.pending .preview_list_element').remove(); 

					// Paint the
					var event_list_html = CalendarObject.PendingEventList.paint_pending_event_list(new_events); 
					$('.panel.calendar .display_system .event_list.pending').append(event_list_html);

					// Bind preview list elements
					CalendarObject.PendingEventList.bind_all_pending_event_list_elements(); 

				} catch(e) {
					alert("Unknown error "+ e +".");
					return;
				}

			});

		}, // END - refresh_pending_event_list(); 

		// 

		refresh_unviewed_event_list : function() {

			var data = {
				"action" : "FIND_UNVIEWED_EVENTS",
				"credentials" : CREDENTIALS_OBJECT, // user authentication
				// "last_received_event_id" : PushObject.Test.latest_id_for_received_event // 0 // - default value
			}
			console.log(data);

			$.post(API_PHP_URL + 'api.php', data, function(responseText){
				try {

					// console.log(responseText);
					var new_events = JSON.parse(responseText); 
					// console.log(new_events); 

					// SQI
					console.log("User has - " , new_events.length , " - pending events!"); 
					if ( new_events.length > 0 ) { 
						// Remove any potential informers
						CalendarObject.PendingEventList.remove_pending_list_informer(); 
						// Add an alert to the event_list_header tab
						$('.panel.calendar .display_system .event_list_header .tab[data-event_list="pending"]').addClass('alert');
						// Display the .pending_event_list
						CalendarObject.EventListController.switch_to_event_list("pending"); // 
					} 
					else {
						// If no pending events remain, create an informer
						CalendarObject.PendingEventList.create_pending_list_informer(); 
						// Remove the alert class
						$('.panel.calendar .display_system .event_list_header .tab[data-event_list="pending"]').removeClass('alert');
						// Don't need to continue down the function
						return false; 
					}

					// Clear any pending events that may be here
					// TODO : Maybe we don't have to do this... if we refresh the list properly, or check for duplicates 
					$('.panel.calendar .display_system .event_list.pending .preview_list_element').remove(); 

					// Paint the
					var event_list_html = CalendarObject.PendingEventList.paint_pending_event_list(new_events); 
					$('.panel.calendar .display_system .event_list.pending').append(event_list_html);

					// Bind preview list elements
					CalendarObject.PendingEventList.bind_all_pending_event_list_elements(); 

				} catch(e) {
					alert("Unknown error "+ e +".");
					return;
				}

			});

		}, // END - refresh_unviewed_event_list(); 

		// 

		paint_pending_event_list : function(data){

			var html_event_list = '';
			var html_clear_float = '<div class="float_ender padding_static_80"></div>';
			
			if (data != undefined){

				for ( var i = 0 , data_length = data.length ; i < data_length ; i++ ){

					console.log(data[i]);
					html_event_list += CalendarObject.PendingEventList.paint_pending_event_list_element(data[i]);



					/*
					// ---------------------------------------------------------------------
					// Update the Push Object // PUSHX
					if (i == (data_length - 1)) {
						// We are on the LAST message in our array
						// Check to see that the push object exists
						if(typeof PushObject != 'undefined'){
							// Set the latest loaded request id 
							console.log(data[i].id);
							PushObject.Test.set_id_for_received_event(data[i].id); 
						} // END - if()
					} // END - if()
					// ---------------------------------------------------------
					*/

				} // END - for()

				PushObject.Test.set_id_for_received_event(data[(data.length -1)].id); 

			} // END - if()
			
			var html =
				//'<div class="calendar_event_block">' +
					html_event_list; //+
					//html_clear_float +
				//'</div>';
				
			return html;

		}, 

		paint_pending_event_list_element : function(event) {

			var sub_class = ''; 

			if (event['accepted'] != undefined){
				if(event['accepted'] == 0){
					sub_class = 'pending_user';
				} else {
					sub_class = 'unviewed';
				}
			}

			// Trigger our alert system
			AlertsObject.Navigation.highlight('calendar'); 

			//var html =	'<div class="preview_list_element pending_user" ' +
			var html =	'<div class="preview_list_element ' + sub_class + '" ' +
										'data-id="' + event['id'] + '" ' + 
									'>' + 
										'<div class="description">' +
											event['description'] + 
										'</div>' + 
									'</div>';

			return html;

		}, 

		// 

		remove_pending_event_list_element : function(event_id) { // SQI

			// Remove the event from the event list
			var selector = 	$('.panel.calendar .event_list.pending ' + 
												'.preview_list_element[data-id=' + event_id + ']');
			$(selector).remove();

			// If no pending events remain, create an informer
			if( $('.panel.calendar .display_system .event_list.pending .preview_list_element').length == 0 ){
				CalendarObject.PendingEventList.create_pending_list_informer(); 
				// Remove the alert class
				$('.panel.calendar .display_system .event_list_header .tab[data-event_list="pending"]').removeClass('alert');
			}

		}, 

		//

		create_pending_list_informer : function() { 
			
			// Remove any potential informers that may exist
			CalendarObject.PendingEventList.remove_pending_list_informer(); 

			// Create day list informer
			var inform = '<div class="inform"> You have no pending events.<br/>Nobody loves you!</div>';

			// Create reusable asset
			var dom_object = $('.panel.calendar .display_system .event_list.pending');

			// Check if there are ANY pending event list elements already in here
			if( dom_object.length == 0){
				// Append it to the day event list
				dom_object.append(inform); 
			}

		}, 

		remove_pending_list_informer : function() {
			// Clean up after ourselves
			$('.panel.calendar .display_system .event_list.pending .inform').remove(); 
		}, 

		//

		bind_all_pending_event_list_elements : function() {

			$('.panel.calendar .display_system .event_list.pending .preview_list_element').unbind();
			$('.panel.calendar .display_system .event_list.pending .preview_list_element').bind('tap click', function(click_event){
				var event_id = $(click_event.currentTarget).attr('data-id');
				CalendarObject.EventDetails.switch_to_event_from_click(event_id, true);
			});

		},

		// 

		initialize : function() {
			// CalendarObject.PendingEventList.refresh_pending_event_list(); 
			CalendarObject.PendingEventList.refresh_unviewed_event_list(); 
		}

	} // END - CalendarObject.PendingEventList



	CalendarObject.EventListController = {
		// Controls the display of the DayEventList and MonthEventList // UUUU

		switch_to_event_list : function (event_list, target_element){

			// The highlighted text parts 
			$('.panel.calendar .display_system .event_list_header .tab').removeClass('selected');

			if( target_element != undefined ){
				target_element.addClass('selected');
			} else {
				$('.panel.calendar .display_system .event_list_header .tab[data-event_list="' + event_list + '"]').addClass('selected'); 
			}


			$('.panel.calendar .display_system .event_list_container > *').hide();

			// TODO : 
			// Fix up the class names so that this flows a little better - I can't really think right now .

			switch(event_list){
				case "day" : 
					$('.panel.calendar .display_system .event_list_container .day').show();
					break;
				case "month" : 
					$('.panel.calendar .display_system .event_list_container .month').show();
					break;
				case "pending" :
					$('.panel.calendar .display_system .event_list_container .pending').show();
					break;
				default : 
					console.log("something went terribly, terribly wrong!"); 
					break;
			}
		// 
		},

		bind_event_list_header_buttons : function() {
			$('.panel.calendar .display_system .event_list_header .tab').unbind();
			$('.panel.calendar .display_system .event_list_header .tab').bind('tap click', function(event){
				var target_element 	= $(event.currentTarget);
				var event_list 			= target_element.attr('data-event_list');
				CalendarObject.EventListController.switch_to_event_list(event_list, target_element); 
			});
		},

		initialize : function() {
			CalendarObject.EventListController.bind_event_list_header_buttons(); 
		}

	};



	// ---------------------------------------------------------------------------------------------------------------
	CalendarObject.EventDetails = {
	// ---------------------------------------------------------------------------------------------------------------

		display_event_details_panel : function(state) {

			// If there is no state, toggle the details panel ; otherwise, do what it says
			// TODO - add the toggle later 

			if(state == true){
				// Hide the helper pane
				$('.panel.calendar .display_system .far_right_panel').hide(); 
				// Display the event details panel
				$('.panel.calendar .display_system .right_panel').show(); 
			} 
			else if(state == false) {
				// Hide the event details panel
				$('.panel.calendar .display_system .right_panel').hide(); 
				// Show the helper pane
				$('.panel.calendar .display_system .far_right_panel').show(); 
			} 
			else {
				console.log("Warning! - display_event_details_panel - was not given a proper argument."); 
			}

		}, // END - display_event_details_panel()

		switch_to_event_from_click : function(event_id, scroll) {

			// If the user clicks any - list element, bookmark, or time slice - this function is called
			// console.log("called - switch_to_event_from_click");

			// Check to see if the server is busy, to prevent click spammers from fucking anything up
			if(CalendarObject.Globals.server_is_busy == true){
				alert("SERVER IS CURRENTLY BUSY - called from switch_to_event_from_click function");
				return false; 
			}

			// ------------------------------------------------------------------------------

			// Do we need to do anything?
			//if(event_id != CalendarObject.Globals.current_event_id){ // COMMENTED OUT UUUU
			var current_event_id = CalendarObject.Globals.current_event_id; 

			// Auto-save the previously selected event - before we move on to the "current" event
			if (event_id != current_event_id) {

				// Alerts n' shit
				console.log("You have decided to switch events - calling auto-save"); 
				console.log("- Clicked Event - " , event_id , " - Current Event - " , current_event_id);

				// Auto-save
				CalendarObject.EventDetails.auto_save(current_event_id); // GGX

				// If the event was unviewed , and we're in the pending event list... remove it from the event list
				$('.panel.calendar .display_system .event_list.pending .preview_list_element[data-id="' + current_event_id + '"]').remove(); 

			}

			// ------------------------------------------------------------------------------

			// Scroll event_details to top
			$('.panel.calendar .display_system .event_details').animate(
				{scrollTop : 0 },
				'normal'
			);

			// LOAD THE ITEM THAT THE USER CLICKED ON...
			CalendarObject.EventDetails.load_event_details(event_id);

			// Determine if we need to Auto-Scroll
			if(scroll){
				CalendarObject.DayView.scroll_to_time_slice(event_id); // PPP // ROBBINS 
				// If the current day matches, we get an immediate response
				// If it does not, then this doesn't do anything, and we scroll later on
			}

		}, // END - switch_to_event_from_click()

		// 

		load_event_details : function(event_id) {

			// Let the auto-save know that the server is busy
			CalendarObject.Globals.server_is_busy = true;

			// Show loader 
			$('.panel.calendar .display_system .right_panel .load_overlay').show(); 

			// ---------------------------------------------------

			// Clean up after ourselves
			CalendarObject.EventDetails.clear_existing_event_details();

			// reset the event model
			Event_Model.clear();

			// ---------------------------------------------------

			// Determine if we need to make the server call

			// Check to see if the event currently exists
			// NOTE - it must be parsed as an INT , because all elements in this array are INTEGERS
			var event_already_exists_in_dom = jQuery.inArray( parseInt(event_id), CalendarObject.Globals.array_of_event_ids_already_loaded );

			if(event_already_exists_in_dom != -1){
				// don't need to push to the array
				console.log("event already exists in our DOM array, so we're not going to make a server call"); 
				CalendarObject.EventDetails.display_event_details(event_id);
				return true;
			}

			// ---------------------------------------------------

			var data = {
				"action" : "EVENT_DETAILS", 
				"credentials" : CREDENTIALS_OBJECT, // user authentication
				"conditions" : {
					"event_id" : event_id
				}
			};
			// console.log(data);

			$.post(API_PHP_URL + 'api.php', data, function(responseText){
				try {

					// console.log(responseText);
					if(!responseText){
						alert("DID NOT LOAD FROM SERVER!");
						console.log(responseText);
						return false; 
					}

					var event_details = JSON.parse(responseText);
					console.log("Just Loaded - " , event_details);

					var globals = CalendarObject.Globals; 

					// The event did NOT exist in our array, so the first thing we do is push it there
					// NOTE - we have to force it to be an INT , otherwise, we end up comparing strings with ints and get false negatives 
					globals.array_of_event_ids_already_loaded.push( parseInt(event_id) ); 

					// Push the OBJECT into the right array
					globals.array_of_events_already_loaded.push(event_details); 

					// Now, load the object into our globals
					CalendarObject.EventDetails.display_event_details(event_id);

				} catch(e) {
					alert("Unknown error "+ e +".");
					return;
				}
			});

		}, 

		// 

		find_event_object : function(event_id) { 

			// tries to find a loaded event object within globals.array_of_events_already_loaded
			var globals 					= CalendarObject.Globals; 
			var event_details 		= null;

			// Find the event in the array 
			for ( var i = 0 ; i < globals.array_of_events_already_loaded.length ; i++ ){
				var _event = globals.array_of_events_already_loaded[i];

				if (_event.id == event_id){
					event_details = _event;
					return event_details;
				}

			} // END - for

			return false; //"event " + event_id + " was not found in array_of_events_already_loaded" ; 

		}, 

		// 

		display_event_details : function(event_id) {

			// Hide the helper pane
			$('.panel.calendar .display_system .far_right_panel').hide(); 
			// Make the right panel visible
			$('.panel.calendar .display_system .right_panel').show(); 

			// Takes event details from Globals.array_of_events_already_loaded - writes them to the output areas

			var globals 							= CalendarObject.Globals;
			var event_details 				= CalendarObject.EventDetails.find_event_object(event_id);

			// If by the end of this, nothing is found, then we have a problem
			if(event_details == false){ 
				alert("we have a problem! - could not find " + event_id + " in array_of_events_already_loaded"); 
				return false; 
			}

			var current_time_slice 		= $('.panel.calendar .display_system .calendar_time_map .calendar_time_slice[data-id="' + event_id + '"]');

			// ------------------------------------------------------------------------------------------------

			// Assuming everything went smoothly, load the event details
			globals.current_event_id 	 = event_details.id; 

			// ------------------------------------------------------------------------------------------------

			var refresh_day_view 				= false; 
			var refresh_month_view 			= false;

			if( parseInt(globals.current_day) 		 != parseInt(event_details.start_day) ) {
				globals.current_day 			= parseInt(event_details.start_day);
				refresh_day_view 					= true; 
			}

			if( parseInt(globals.current_month) 	 != parseInt(event_details.start_month) ) {
				globals.current_month 		= parseInt(event_details.start_month);
				refresh_month_view 				= true;
			}

			if( parseInt(globals.current_year) 		!= parseInt(event_details.start_year) ) {
				globals.current_year 			= parseInt(event_details.start_year);
				refresh_month_view 				= true;
			}

			// ------------------------------------------------------------------------------------------------

			// Switch the day to the proper view
			if(refresh_day_view){ 
				console.log("calling refresh_day_view"); 
				CalendarObject.DayView.refresh_day_view(event_id); // ROBBINS 
				refresh_day_view = false;
			}
			else {
				// Highlight the event in the day view (if applicable)
				CalendarObject.DayView.highlight_current_event(); 
				// CalendarObject.DayView.scroll_to_time_slice(event_id); // PPP - Placing this here is accurate, but slow - 
				// I have placed it in switch_to_event_from_click() for a faster response
			}

			// 

			// Switch the month view to the proper view
			if(refresh_month_view){
				console.log("calling refresh_month_view"); 

				alert(globals.current_month + " - AND - " + event_details.start_month); 


				CalendarObject.MonthView.refresh_month_view(event_id);
				refresh_month_view = false;
			}
			else {
				// Highlight the proper view
				CalendarObject.MonthView.highlight_current_day(); 
			}

			// ------------------------------------------------------------------------------------------------
			// Update the Event_Model to match the values pulled from the selected event
			CalendarObject.EventDetails.refresh_event_model(event_id);

			// Set up the date / time pickers properly
			CalendarObject.EventDetails.set_date_picker_elements_to_match_global_values(); 
			CalendarObject.EventDetails.set_time_picker_elements_to_match_global_values(); 

			// ------------------------------------------------------------------------------------------------
			// Check if the current user has created this event

			if (event_details.creator_id == GLOBAL_USER_ID) { // More likely scenario
				var user_created_this_event = true;
				// Enable the contact add button
				$('.panel.calendar .display_system .event_details .edit_button.add_contact').show();
			} 
			else {
				var user_created_this_event = false; 
				// Disable the contact add button
				$('.panel.calendar .display_system .event_details .edit_button.add_contact').hide();
			}

			// ------------------------------------------------------------------------------------------------
			// Check if the current user has accepted this event
			// BBBB

			var user_has_accepted = null; 

			for ( var i = 0 ; i < event_details.event_users.length ; i++ ){

				// Create local reference
				var user = event_details.event_users[i];

				if(user.user_id == GLOBAL_USER_ID){
					// Check if the user has "viewed" the event
					user_has_viewed = user.viewed; 
					// Check if the user has "accepted" the event
					user_has_accepted = user.accepted;
					// Set the bind_id for our event tailored to the current user
					event_details.event_user_bind_id_for_current_user = event_details.event_users[i].id;
					break; 
				}
			}

			// ------------------------------------------------------------------------------------------------
			// We should detect if the event was created by the user - if it WAS, we can auto-accept on the client side
			// TODO : One day, we would want events to be auto-accepted from the START, from the API
			// FFFFF

			if ( (user_has_accepted == 0) && (user_created_this_event == true) ){
				// The user has created this event, but the API system did not "accept" the event for this user
				CalendarObject.EventDetails.update_event_request(event_details.id, 1); // FFFFF 
				// hide the panel since we don't need it anymore
				$('.panel.calendar .display_system .event_details .accept_options').hide();
			} 
			else if(user_has_accepted == 0){
				$('.panel.calendar .display_system .event_details .accept_options').show();
			} 
			else {
				$('.panel.calendar .display_system .event_details .accept_options').hide();
			}

			// ------------------------------------------------------------------------------------------------
			// Update viewed if it needs to be updated

			// NOTE : It is possible for the user to "view" the event but not accept it , and then refresh their browser
			// It will then not be picked up by "VIEW_UNVIEWED_EVENTS" and disappear from the pending screen
			// In order to circumvent this, we will NOT update the view until the user has accepted as well . 

			if(user_has_accepted == 0) {
				// The user has NOT accepted the event before - update viewed on update accepted 
				event_details.update_event_viewed = true; 
				// GHAGHA
			} 
			else {
				// The user HAS accepted the event before
				if (user_has_viewed == 0) {
					CalendarObject.EventDetails.update_event_viewed(event_details.id, 1); 
				}
			}


			// ------------------------------------------------------------------------------------------------
			// Populate data fields

			$('.panel.calendar .display_system .event_details .description textarea').val(event_details.description);
			$('.panel.calendar .display_system .event_details .location').val(event_details.location);

			// ------------------------------------------------------------------------------------------------
			// Display attached CONTACTS! 

			var total_event_contacts = event_details.event_users.length;
			if( total_event_contacts > 0){

				// Create an array of note_ids and make sure that it's empty
				event_details.array_of_user_ids_loaded_from_current_event = [];
				event_details.array_of_user_ids_loaded_from_current_event.length = 0; 

				for ( var i = 0 ; i < total_event_contacts ; i++ ){
					// Create object for simple reference
					var user_object = event_details.event_users[i];
					// Draw the object to the screen
					CalendarObject.EventDetails.paint_contact_list_element( user_object );
					// Push each ID to our array
					event_details.array_of_user_ids_loaded_from_current_event.push( user_object.user_id ); 
				} // END - for()
			} // END - if 

			// ------------------------------------------------------------------------------------------------
			// Display attached TASKS!

			var total_event_tasks = event_details.event_tasks.length; // LLLL
			if( total_event_tasks > 0){

				// Create an array of note_ids
				// We will use this array to revert to original settings, should the user every press "cancel" during the note binding process
				event_details.array_of_task_ids_loaded_from_current_event = [];
				// Make sure that it's empty
				event_details.array_of_task_ids_loaded_from_current_event.length = 0; 

				for ( var i = 0 ; i < total_event_tasks ; i++ ){

					var task_object 			= event_details.event_tasks[i];
					var task_id 					= task_object['task_id'];
					var task_description 	= task_object['description'];

					// TODO - we can use the Contacts name_array for this instead!
					CalendarObject.EventDetails.paint_task_list_element(task_id, task_description);

					// Push each ID to our array
					event_details.array_of_task_ids_loaded_from_current_event.push(task_id); 

				} // END - for()
			} // END - if 

			// ------------------------------------------------------------------------------------------------
			// Display attached NOTES!

			var total_event_notes = event_details.event_notes.length;
			if( total_event_notes > 0){

				// Create an array of note_ids
				// We will use this array to revert to original settings, should the user every press "cancel" during the note binding process
				event_details.array_of_note_ids_loaded_from_current_event = [];
				// Make sure that it's empty
				event_details.array_of_note_ids_loaded_from_current_event.length = 0; 

				for ( var i = 0 ; i < total_event_notes ; i++ ){

					var note_object 			= event_details.event_notes[i];
					var note_id 					= note_object['note_id'];
					var note_body 				= note_object['body'];

					// TODO - we can use the Contacts name_array for this instead!
					CalendarObject.EventDetails.paint_note_list_element(note_id, note_body);

					// Push each ID to our array
					event_details.array_of_note_ids_loaded_from_current_event.push(note_id); 

				} // END - for()
			} // END - if 

			// ------------------------------------------------------------------------------------------------

			// Check for dragging events!
			// KKK
			if(CalendarObject.DayView.time_slice_was_dragged){
				console.log("the time slice was DRAGGED!"); 

				// Update DOM object after a drag! - PPP
				var event_start_time 					= current_time_slice.attr('data-start_time'); 
				event_details.start_hour 			= event_start_time.substr(0, 2); 
				event_details.start_minute 		= event_start_time.substr(3, 2); 

				var event_finish_time 				= current_time_slice.attr('data-finish_time'); 
				event_details.finish_hour 		= event_finish_time.substr(0, 2); 
				event_details.finish_minute 	= event_finish_time.substr(3, 2); 

				// We still want to update the picker values!
				CalendarObject.EventDetails.update_all_picker_elements_after_a_drag(event_id); 

				// End any dragging that may have occurred
				CalendarObject.DayView.is_dragging_time_slice = false; 
				console.log("DRAGGING - FALSE"); 
			} 

			else if (CalendarObject.DayView.time_slice_was_resized){
				console.log("the time slice WAS scaled!"); 

				// Update DOM object after a drag! - PPP
				var event_start_time 					= current_time_slice.attr('data-start_time'); 
				event_details.start_hour 			= event_start_time.substr(0, 2); 
				event_details.start_minute 		= event_start_time.substr(3, 2); 

				var event_finish_time 				= current_time_slice.attr('data-finish_time'); 
				event_details.finish_hour 		= event_finish_time.substr(0, 2); 
				event_details.finish_minute 	= event_finish_time.substr(3, 2); 

				// We still want to update the picker values!
				CalendarObject.EventDetails.update_all_picker_elements_after_a_drag(event_id); 

				CalendarObject.DayView.is_scaling_time_slice = false; 
				console.log("SCALING - FALSE"); 
			}

			else {
				console.log("the event was not dragged or resized"); 
			}

			// ------------------------------------------------

			// Now that all of the event details have been saved, we can safely enable autosave
			CalendarObject.Globals.server_is_busy = false;

			// Hide loader after all is loaded
			$('.panel.calendar .display_system .right_panel .load_overlay').fadeOut(FADE_OUT_SPEED); 

		},

		// JJJJ

		force_server_refresh : function(event_id) {

			console.log("forcing refresh - ", event_id); 

			// The reason we use the load_event_details / display_event_details system is because 
			// we don't want to hammer the server every time the user nudges an event 5 pixels. 
			// HOWEVER - there will be times when we WANT the server to refresh (e.g. push notification)
			// In which case, we cannot go through normal channels. 

			// To integrate this with the existing system, we are going to remove the event_id from the two DOM arrays
			// At which point, calling "load_event_details()" is going to force a server refresh. 
			CalendarObject.EventDetails.remove_event_from_local_storage(event_id); 

			// Load the object again (we ARE refreshing, right?); 
			CalendarObject.EventDetails.load_event_details(event_id); 

		},

		remove_event_from_local_storage : function(event_id) {

			var globals 						= CalendarObject.Globals; 
			var event_id_int 				= parseInt(event_id); // PICKY fucking function - must MAKE SURE it's a goddamn int!

			// Remove from the ID array -------------------------------------------------
			globals.array_of_event_ids_already_loaded.remove_value_from_array(event_id_int); 

			// Remove the object --------------------------------------------------------
			// Find the event in the array 
			for ( var i = 0 ; i < globals.array_of_events_already_loaded.length ; i++ ){
				var _event = globals.array_of_events_already_loaded[i];
				// 
				if ((_event.id == event_id_int) || (_event.id == event_id)) { 			// again, fucked up functions
					globals.array_of_events_already_loaded.splice(i, 1); 							// delete doesn't really do the job properly
					return true;
				}

			} // END - for

			// If we've gotten this far without finding the right object, we're in trouble
			return false; 

		}, 

		//

		cancel_event_creation : function (event_id) {

			// Remove time slices, if they exist
			$('.panel.calendar .display_system .calendar_time_map .calendar_time_slice[data-id="0"]').remove(); 

			console.log("this is a newly created, non-saved event");
			$('.panel.calendar .new_event_element').remove();

			// XXX

			// Reset any variables from a potential previous drag
			CalendarObject.DayView.reset_drag_values(); 

			// We are returning to the event details screen, but our ID is still 0
			// So, we are just going to clear any lingering event details
			CalendarObject.EventDetails.clear_existing_event_details(); 

			// Show the helper pane
			$('.panel.calendar .display_system .far_right_panel').show(); 

			// Toggle the headers
			$('.panel.calendar .header.main.cancel').hide(); 
			$('.panel.calendar .header.main.default').show();

		}, 

		delete_event : function (event_id) {

			console.log("attempting to delete - " , CalendarObject.Globals.current_event_id);

			// Check if this is a new event
			if(event_id == 0){
				CalendarObject.EventDetails.cancel_event_creation(event_id); 
				return true;
			}

			var event_object 		= CalendarObject.EventDetails.find_event_object(event_id); 

			// Check if the current user is the creator of the event
			// If NOT the creator - reject the event - otherwise, delete it 
			if(event_object['user_id'] == GLOBAL_USER_ID){
				console.log("current user is the event creator - DELETING event"); 

				// Delete from the database
				var data = {
					"action" : "DELETE_EVENT", 
					"credentials" : CREDENTIALS_OBJECT, // user authentication
					"Event" : {
						"id" : event_id
					}
				}; 

				console.log(data);

				$.post(API_PHP_URL + 'api.php', data, function(responseText){ // FFF
					try {

						console.log(responseText); 

						// Delete the task list object in the DOM, after successful deletion
						CalendarObject.MonthEventList.destroy_event_dom_elements(event_id);

						// Check if this is the last event in line 
						if( $('.panel.calendar .display_system .event_list.day .preview_list_element').length == 0 ){
							// Append informer
							CalendarObject.DayEventList.create_day_list_informer(); 
							// Use the local object for one last hurrah
							var day_number 			= event_object['start'].substr(8, 2);
							// Remove has_event if it was there
							$('.panel.calendar .calendar_day_block[data-id="' + day_number + '"]').removeClass('has_event'); 
						} 

						// Clean up after ourselves
						CalendarObject.EventDetails.clear_existing_event_details();

						// Display the HELPER panel 
						CalendarObject.EventDetails.display_event_details_panel(false); 

					} 
					catch(e) {
						alert("Unknown error " + e + ".");
						return;
					}
				}); // END - $.post

			} // END - if(event_object['user_id'] == GLOBAL_USER_ID)
			else {
				console.log("user is NOT the creator of the event - a rejection will be used instead"); 
				CalendarObject.EventDetails.update_event_request(event_id, 2); 
			} 

		}, // END - delete_event()

		// 

		update_event_request : function(event_id, accept_status) {

			var event_object 		= CalendarObject.EventDetails.find_event_object(event_id);
			var bind_id 				= event_object.event_user_bind_id_for_current_user; // NOTE : we set this in display_event_details()

			if(accept_status == 1){
				var data = {
					"action" 				: "ACCEPT_EVENT",
					"credentials" 	: CREDENTIALS_OBJECT, // user authentication
					"id" 						: bind_id, // id of the bind table 
				}
			} else if (accept_status == 2){
				var data = {
					"action" 				: "REJECT_EVENT",
					"credentials" 	: CREDENTIALS_OBJECT, // user authentication
					"id" 						: bind_id, // id of the bind table 
				}
			}
			console.log(data);

			$.post(API_PHP_URL + 'api.php', data, function(responseText){
				try {

					console.log(responseText);

					if(accept_status == 1) {

						// get our time slice
						var current_time_slice = $('.panel.calendar .display_system .calendar_time_map .calendar_time_slice[data-id="' + event_id + '"]');

						// update the event object // FFFFF
						for ( var i = 0 ; i < event_object.event_users.length ; i++ ){
							if(event_object.event_users[i].user_id == GLOBAL_USER_ID){
								// We've found our current user!
								event_object.event_users[i].accepted = accept_status;
								break; 
							}
						}

						// Update the user_accepted boolean ; strange.. 
						// TODO - I need to look into this more. Why do I have the code at the top?
						event_object.user_accepted = 1; 

						// Remove the pending event list element
						CalendarObject.PendingEventList.remove_pending_event_list_element(event_id); // SQI

						if ( event_object.start_day == CalendarObject.Globals.current_day ) {
							// If the event takes place on the current day, add it to the day event list
							CalendarObject.DayEventList.paint_event_list_element(event_object); 
							// Refresh the day view - to update time slices and check if all users have accepted or not
							CalendarObject.DayView.refresh_day_view(event_id); 
						}

						if ( event_object.start_month == CalendarObject.Globals.current_month ){
							// If the event takes place in the current month, add it to the month event list
							CalendarObject.MonthEventList.paint_event_list_element(event_object); 
							// 
						}

					} 
					else if (accept_status == 2){

						// Delete the task list object in the DOM, after successful deletion
						CalendarObject.MonthEventList.destroy_event_dom_elements(event_id);

						// Check if this is the last event in line 
						if( $('.panel.calendar .display_system .event_list.day .preview_list_element').length == 0 ){
							// Append informer
							CalendarObject.DayEventList.create_day_list_informer(); 
							// Use the local object for one last hurrah
							var day_number 			= event_object['start'].substr(8, 2);
							// Remove has_event if it was there
							$('.panel.calendar .calendar_day_block[data-id="' + day_number + '"]').removeClass('has_event'); 
						} 

						// Clean up after ourselves
						CalendarObject.EventDetails.clear_existing_event_details();

					}

					// Either way, make the accept_options disappear
					$('.panel.calendar .display_system .event_details .accept_options').hide();

					// Check if the user has to update the event viewed as well
					// GHAGHA

					var should_update = event_object['update_event_viewed'];

					if( should_update != undefined ){
						if( should_update == true ){
							// Update the view
							CalendarObject.EventDetails.update_event_viewed(event_id, 1); 
							// Update the variable
							should_update = false; 
						}
					}

				} catch(e) {
					alert("Unknown error "+ e +".");
					return;
				}
			});

		}, // END - update_event_request(); 

		// 

		update_event_viewed : function(event_id, view_status) {

			// Typically, we're going to just mark the event as "viewed" once the user has clicked on it
			var event_object 		= CalendarObject.EventDetails.find_event_object(event_id);
			var bind_id 				= event_object.event_user_bind_id_for_current_user; // NOTE : we set this in display_event_details()

			if(view_status == 1){
				var data = {
					"action" 				: "UPDATE_EVENT_VIEWED",
					"credentials" 	: CREDENTIALS_OBJECT, // user authentication
					"bind_id" 			: bind_id, // id of the bind table 
				}
			} 
			console.log(data);

			$.post(API_PHP_URL + 'api.php', data, function(responseText){
				try {

					console.log(responseText);

					// Update the local event object
					for ( var i = 0 ; i < event_object.event_users.length ; i++ ){
						if(event_object.event_users[i].user_id == GLOBAL_USER_ID){
							// We've found our current user!
							event_object.event_users[i].viewed = 1;
							break; 
						}
					}

				} catch(e) {
					alert("Unknown error "+ e +".");
					return;
				}
			});

		},  // END - update_event_viewed(); 

		//

		clear_new_event_details : function() {

			// Sets default values for the event model start/end times
			Event_Model.clear();

			// Wipe all information in the event details
			$('.panel.calendar .new_event_system .event_details .description textarea').val("");
			$('.panel.calendar .new_event_system .event_details .location').val("");

			$('.panel.calendar .new_event_system .event_details .start_date').val("");
			$('.panel.calendar .new_event_system .event_details .start_time').val("");

			$('.panel.calendar .new_event_system .event_details .finish_date').val("");
			$('.panel.calendar .new_event_system .event_details .finish_time').val("");

			// Remove preview list elements
			// WARNING!!
			// TODO - watch out - this may interfere with time match
			$('.panel.calendar .new_event_system .preview_list_element').remove(); 

			// Wipe the global DOM object details
			var event_object = CalendarObject.EventDetails.find_event_object(0); 

			event_object.description 							= null; 
			event_object.location 								= null; 

			event_object.event_users.length 			= 0; 
			event_object.event_tasks.length 			= 0; 
			event_object.event_notes.length 			= 0; 

			event_object.array_of_user_ids_assigned_to_current_event.length 			= 0; 
			event_object.array_of_task_ids_assigned_to_current_event.length 			= 0; 
			event_object.array_of_note_ids_assigned_to_current_event.length 			= 0; 

			event_object.array_of_user_ids_loaded_from_current_event.length 			= 0; 
			event_object.array_of_task_ids_loaded_from_current_event.length 			= 0; 
			event_object.array_of_note_ids_loaded_from_current_event.length 			= 0; 

			event_object.start_year 							= null; 
			event_object.start_month 							= null; 
			event_object.start_day 								= null; 
			event_object.start_hour 							= null; 
			event_object.start_minute 						= null; 
			event_object.start_second 						= null; 

			event_object.finish_year 							= null; 
			event_object.finish_month 						= null; 
			event_object.finish_day 							= null; 
			event_object.finish_hour 							= null; 
			event_object.finish_minute 						= null; 
			event_object.finish_second 						= null; 

			// TODO - 
			// remember to use remove() on the child elements to get rid of any lingering functions and prevent memory leaks!;

		},

		clear_existing_event_details : function() {

			// Reset the event_id to null
			// Otherwise, many bugs occur - 
				// Autosave would kick in and consider the event a "new" event ; saving an event you "cancel"
				// Refreshing the month / day view would clear event details but save that to the "current" event 
			CalendarObject.Globals.current_event_id = null; 

			Event_Model.clear();

			// $('.panel.calendar .display_system .event_details .description').val("");
			$('.panel.calendar .display_system .event_details .description textarea').val("");

			$('.panel.calendar .display_system .event_details .location').val("");
			$('.panel.calendar .display_system .event_details .start_date').val("");
			$('.panel.calendar .display_system .event_details .start_time').val("");
			$('.panel.calendar .display_system .event_details .finish_date').val("");
			$('.panel.calendar .display_system .event_details .finish_time').val("");

			// Wipe attached elements
			CalendarObject.EventDetails.clear_contact_list_elements(); 
			CalendarObject.EventDetails.clear_task_list_elements(); 				// LLLL
			CalendarObject.EventDetails.clear_note_list_elements(); 				// HHHH

			// TODO - 
			// remember to use remove() on the child elements to get rid of any lingering functions and prevent memory leaks!;

		},

		//

		auto_save : function() {

			// return false; // UUU
			console.log("autosave activated"); 

			if(CalendarObject.Globals.current_event_id == null){
				console.log("previous event was null - not going to auto-save");
				return false;
			}

			var globals = CalendarObject.Globals; // DDD

			// Check if the server is busy to prevent saving data into events before it is loaded
			// A very dirty thing indeed!
			if(CalendarObject.Globals.server_is_busy == true){
				console.log("the server is currently loading an event, so I am NOT going to auto-save!");
				return false; 
			} 
			else {
				// Actually SAVE the event
				var event_id = CalendarObject.Globals.current_event_id; 
				console.log("AUTO SAVING... " , event_id); 
				CalendarObject.EventDetails.save_event(event_id);
				return true; 
			}

		}, // END - auto_save

		//

		save_event : function(event_id) {
			// Check for new events
			if(CalendarObject.Globals.current_event_id == 0){
				console.log("saving new event...");
				CalendarObject.NewEvent.create_event();
			} 
			else {
				console.log("updating...");
				// Update the local object
				CalendarObject.EventDetails.update_event_object(event_id);
				// Once done, update the SERVER event
				CalendarObject.EventDetails.update_existing_event(event_id);
			}
		},

		//

		update_event_object : function(event_id) {

			// updates the details of an existing event LOCALLY - does NOT post to the server

			var globals 				= CalendarObject.Globals;
			var event_object 		= CalendarObject.EventDetails.find_event_object(event_id);

			// If by the end of this, nothing is found, then we have a problem
			if(event_object == false){ 
				alert("we have a problem! - we could not found " + event_id + " in array_of_events_already_loaded"); 
				return false; 
			}

			// ------------------------------------------------------------------------------------------------
			// Get the latest global values for start/end times, and apply them to the Event_Model
			CalendarObject.EventDetails.refresh_event_model(event_id);

			// ERROR CHECK - Don't save the event if it has a blank description
			// This could help us figure out why auto_save fucks up!
			if ( $('.panel.calendar .display_system .event_details .description textarea').val() == "" ){
				alert(" WARNING : description is empty! Aborting save. "); 
				return false; 
			}

			// ------------------------------------------------------------------------------------------------
			// Remember : we are updating an EXISTING event, we are going to be pulling our information from the .display_system
			// If we are creating a new event, our information will be pulled from the .new_event_system

			event_object.event_type_id 		= "1"; 
			event_object.description 			= $('.panel.calendar .display_system .event_details .description textarea').val();
			event_object.location 				= $('.panel.calendar .display_system .event_details .location').val();
			event_object.start 						= Event_Model.get_start_datetime();
			event_object.finish 					= Event_Model.get_finish_datetime();

			// 

			// Redraw the time slice object on the screen . 
			CalendarObject.DayView.redraw_time_slice(event_id); 

		},

		//

		update_existing_event : function(event_id){

			var event_object 	= CalendarObject.EventDetails.find_event_object(event_id);

			var data = { 
				"action" 					: "UPDATE_EVENT",
				"credentials" 		: CREDENTIALS_OBJECT, // user authentication
				"id"							: event_id,
				"event_type_id"		: event_object.event_type_id,
				"description"			: event_object.description, 
				"start"						: event_object.start,
				"finish"					: event_object.finish,
				"location"				: event_object.location
			} 
			// console.log(data);

			var event_description = event_object.description; // DDDD
			// console.log("Update Existing Event " , event_id + ' , ' +  event_description);

			$.post(API_PHP_URL + 'api.php', data, function(responseText){
				try {

					console.log(responseText);

					// ------------------------------------------------------------------------------------------------
					// TODO - refactor this eventually - ?? - not sure I want to right now. or that it's necessary

					var time_slice_data = CalendarObject.DayView.calculate_time_slice_data(		event_object.start_hour, 
																																										event_object.start_minute, 
																																										event_object.finish_hour, 
																																										event_object.finish_minute
																																								); 

					var offset = CalendarObject.DayView.calculate_time_bar_offset(time_slice_data.event_start_time);

					// ------------------------------------------------------------------------------------------------
					// FXFXFX
					// EKS

					var descriptions 		= $('.panel.calendar .display_system').find('*[data-id="' + event_id + '"] .description');
					var time_slice 			= $('.panel.calendar .display_system .calendar_time_map .calendar_time_slice[data-id="' + event_id + '"]'); 

					// Update description - time slice and list elements
					descriptions.html(event_object.description);

					// Update time slice CSS
					time_slice.css( 'height', ((time_slice_data.total_slices * CalendarObject.Globals.css_height_of_time_slice) + 'px') ); 
					time_slice.css( 'top', offset.top + 'px'); 

					// Update time slice data
					time_slice.attr('data-start_time'			, (event_object.start_hour + ':' + event_object.start_minute) 	);
					time_slice.attr('data-start_hour'			, event_object.start_hour 				);
					time_slice.attr('data-start_minute'		, event_object.start_minute 			);

					time_slice.attr('data-finish_time'		, (event_object.finish_hour + ':' + event_object.finish_minute) 	);
					time_slice.attr('data-finish_hour'		, event_object.finish_hour 				);
					time_slice.attr('data-finish_minute'	, event_object.finish_minute 			); 

					time_slice.attr('data-total_slices'		, time_slice_data.total_slices 		); 

					// 

				} catch(e) {
					alert("Unknown error "+ e +".");
					return;
				}
			});

		}, // END - update_existing_event

		// ---------------------------------------------------------------------------------------------------------
		// EVENT MODEL
		//

		refresh_event_model : function(event_id) {

			// The purpose of this function is to set the Event_Model date to match what the user wants

			// REFERENCE : 
			// Event_Model.set_start: function(year, month, day, hour, minute, second)

			// FXFXFX
			// var event_object 	= CalendarObject.EventDetails.find_event_object(CalendarObject.Globals.current_event_id); 
			var event_object 	= CalendarObject.EventDetails.find_event_object(event_id); 

			Event_Model.set_start ( 		event_object.start_year, 
																	event_object.start_month, 
																	event_object.start_day, 
																	event_object.start_hour, 
																	event_object.start_minute, 
																	event_object.start_second
														);

			Event_Model.set_finish ( 		event_object.finish_year, 
																	event_object.finish_month, 
																	event_object.finish_day, 
																	event_object.finish_hour, 
																	event_object.finish_minute, 
																	event_object.finish_second
														);

			// console.log("Event_Model START - " , Event_Model.get_start_datetime());
			// console.log("Event_Model START OBJECT - " , Event_Model.get_start_datetime_object());
			// console.log("Event_Model FINISH - " , Event_Model.get_finish_datetime());
			// console.log("Event_Model FINISH OBJECT - " , Event_Model.get_finish_datetime_object());

		},

		// START 

		set_start_date_for_current_event : function(year, month, day) {
			// FXFXFX
			// Get the current event
			var event_object 						= CalendarObject.EventDetails.find_event_object(CalendarObject.Globals.current_event_id); 
			// Assign properties
			event_object.start_year 		= year; 
			event_object.start_month 		= month + 1; 
			event_object.start_day 			= day; 
		},

		set_start_time_for_current_event : function(hour, minute) {
			// FXFXFX
			// If we don't format our times, we won't be able to snap with our time grid
			var formatted_hour 			= $.code_snippets.format_time_value(hour); 
			var formatted_minute 		= $.code_snippets.format_time_value(minute); 
			// 
			var event_object 						= CalendarObject.EventDetails.find_event_object(CalendarObject.Globals.current_event_id); 
			event_object.start_hour 		= formatted_hour 			;
			event_object.start_minute 	= formatted_minute 		;
			event_object.start_second 	= 0 									;
		},

		// FINISH 

		set_finish_date_for_current_event : function(year, month, day) {
			// FXFXFX
			var event_object 						= CalendarObject.EventDetails.find_event_object(CalendarObject.Globals.current_event_id); 
			event_object.finish_year 		= year; 
			event_object.finish_month 	= month + 1; 
			event_object.finish_day 		= day; 
		},

		set_finish_time_for_current_event : function(hour, minute) {
			// FXFXFX
			// If we don't format our times, we won't be able to snap with our time grid
			var formatted_hour 			= $.code_snippets.format_time_value(hour); 
			var formatted_minute 		= $.code_snippets.format_time_value(minute); 
			// 
			var event_object 						= CalendarObject.EventDetails.find_event_object(CalendarObject.Globals.current_event_id); 
			event_object.finish_hour 		= formatted_hour 			;
			event_object.finish_minute 	= formatted_minute 		;
			event_object.finish_second 	= 0 									;
		},

		// ---------------------------------------------------------------------------------------------------------
		// BUTTONS
		//

		bind_buttons : function() {
			// Binds all of the buttons on the display_system

			// ADD NOTE 
			$('.panel.calendar .event_details .add_note').unbind();
			$('.panel.calendar .event_details .add_note').bind('tap click', function(event){
				if (CalendarObject.Globals.current_display_system == "display_system"){
					CalendarObject.EventDetails.auto_save();
				}
				CalendarObject.Notes.open_dialog_window();
			});

			// ADD CONTACT
			$('.panel.calendar .event_details .add_contact').unbind(); // GAYGAYGAY
			$('.panel.calendar .event_details .add_contact').bind('tap click', function(event){
				if (CalendarObject.Globals.current_display_system == "display_system"){
					CalendarObject.EventDetails.auto_save();
				}
				CalendarObject.Contacts.open_dialog_window();
			});

			// ADD TASK
			$('.panel.calendar .event_details .add_task').unbind();
			$('.panel.calendar .event_details .add_task').bind('tap click', function(event){
				if (CalendarObject.Globals.current_display_system == "display_system"){
					CalendarObject.EventDetails.auto_save();
				}
				CalendarObject.Tasks.open_dialog_window();
			});

			// DELETE EVENT 
			$('.panel.calendar .display_system .event_details .delete').unbind();
			$('.panel.calendar .display_system .event_details .delete').bind('tap click', function(event){
				CalendarObject.EventDetails.delete_event(CalendarObject.Globals.current_event_id);
			});

			// 

			// ACCEPT EVENT REQUEST
			$('.panel.calendar .display_system .event_details .accept_options .accept_event').unbind();
			$('.panel.calendar .display_system .event_details .accept_options .accept_event').bind('tap click', function(event){
				CalendarObject.EventDetails.update_event_request(CalendarObject.Globals.current_event_id, 1);
			});

			// REJECT EVENT REQUEST
			$('.panel.calendar .display_system .event_details .accept_options .reject_event').unbind();
			$('.panel.calendar .display_system .event_details .accept_options .reject_event').bind('tap click', function(event){
				CalendarObject.EventDetails.update_event_request(CalendarObject.Globals.current_event_id, 2);
			});

		}, // END - bind_buttons();

		// ---------------------------------------------------------------------------------------------------------
		// DATE PICKERS
		//

		bind_date_picker_elements : function() {

			// START DATE PICKER
			$('.panel.calendar .display_system .start_date').datepicker({
				onClose: function(dateText, inst) {
					// Update the Globals.start_date object
					CalendarObject.EventDetails.set_start_date_for_current_event(inst.currentYear, inst.currentMonth, inst.currentDay);
					// Set the selected date as the MINIMUM value for the FINISH picker
					CalendarObject.EventDetails.refresh_date_picker_elements(); 
					// 
					// Update the LOCAL object for the current event
					CalendarObject.EventDetails.update_event_object(CalendarObject.Globals.current_event_id); 
					// 
						// CalendarObject.EventDetails.refresh_view_to_match_date_picker_elements(inst); 
				}, 
			});

			// FINISH DATE PICKER
			$('.panel.calendar .display_system .finish_date').datepicker({
				onClose: function(dateText, inst) {
					// Update the Globals.start_date object
					CalendarObject.EventDetails.set_finish_date_for_current_event(inst.currentYear, inst.currentMonth, inst.currentDay);
					// 
					// Update the LOCAL object for the current event
					CalendarObject.EventDetails.update_event_object(CalendarObject.Globals.current_event_id); 
				}
			});

		},

		refresh_date_picker_elements : function() {

			// Check if this is a new event or not
			var current_system = "." + CalendarObject.Globals.current_display_system; 
			// NOTE - the "." is important, because it's a CLASS name!

			//console.log("CALLED REFRESH DATE PICKER for  - ", current_system);

			// Get the date of the START picker
			var minDate = $( ".panel.calendar " + current_system + " .start_date" ).datepicker( "getDate" );
			
			// Set that value as the MINIMUM date for the FINISH picker
			$( ".panel.calendar " + current_system + " .finish_date" ).datepicker( "option", "minDate", minDate );

			// TODO - future versions will allow multi-day events. For now, we lock them in to a single day. 
			$( ".panel.calendar " + current_system + " .finish_date" ).datepicker( "option", "maxDate", minDate );

			// Update the global values to match what is on the pickers
			CalendarObject.EventDetails.set_global_values_to_match_date_picker_elements();

		},

		refresh_view_to_match_date_picker_elements : function(inst) {

			var globals = CalendarObject.Globals; 

			var refresh_day_view 				= false; 
			var refresh_month_view 			= false;

			if(globals.current_day 		 != inst.currentDay) {
				globals.current_day 			= inst.currentDay;
				refresh_day_view 					= true; 
			}

			if(globals.current_month 	 != inst.currentMonth) {
				globals.current_month 		= inst.currentMonth;
				refresh_month_view 				= true;
			}

			if(globals.current_year 	 != inst.currentYear) {
				globals.current_year 			= inst.currentYear;
				refresh_month_view 				= true;
			}

			// ------------------------------------------------------------------------------------------------

			// Switch the day to the proper view
			if(refresh_day_view){ 
				console.log("calling refresh_day_view"); 
				CalendarObject.DayView.refresh_day_view();
				refresh_day_view = false;
			}
			else {
				// Highlight the event in the day view (if applicable)
				CalendarObject.DayView.highlight_current_event(); 
			}

			// 

			// Switch the month view to the proper view
			if(refresh_month_view){
				console.log("calling refresh_month_view"); 
				CalendarObject.MonthView.refresh_month_view();
				refresh_month_view = false;
			}
			else {
				// Highlight the proper view
				CalendarObject.MonthView.highlight_current_day(); 
			}

		}, // END - refresh_view_to_match_date_picker_elements(); 

		set_global_values_to_match_date_picker_elements : function() { 

			// Check if this is a new event or not
			var current_system = "." + CalendarObject.Globals.current_display_system; 

			// Apply the current values of the START datepicker to the global event object
			var start = $('.panel.calendar ' + current_system + ' .start_date').datepicker("getDate"); 
			CalendarObject.EventDetails.set_start_date_for_current_event( start.getFullYear(), start.getMonth(), start.getDate() );

			// Apply the current values of the FINISH datepicker to the global event object
			var finish = $('.panel.calendar ' + current_system + ' .finish_date').datepicker("getDate"); 
			CalendarObject.EventDetails.set_finish_date_for_current_event( finish.getFullYear(), finish.getMonth(), finish.getDate() );

		}, 

		set_date_picker_elements_to_match_global_values : function() {

			// Both the time and date pickers accept a date object
			// REFERENCE : new Date(year, month, day, hours, minutes, seconds, milliseconds)

			// IMPORTANT - MONTH HAS TO BE REDUCED BY ONE UNIT!

			// FXFXFX
			var event_object 	= CalendarObject.EventDetails.find_event_object(CalendarObject.Globals.current_event_id); 

			var start_date 		= new Date ( 		event_object.start_year , 
																				event_object.start_month - 1, 
																				event_object.start_day, 
																				event_object.start_hour, 
																				event_object.start_minute, 
																				event_object.start_second
																		);

			var finish_date 		= new Date ( 	event_object.finish_year , 
																				event_object.finish_month - 1, 
																				event_object.finish_day, 
																				event_object.finish_hour, 
																				event_object.finish_minute, 
																				event_object.finish_second
																		);

			// Check if this is a new event or not
			var current_system = "." + CalendarObject.Globals.current_display_system; 
			// NOTE - the "." is important, because it's a CLASS name!
			//console.log("CALLED REFRESH DATE PICKER for  - ", current_system);

			// DATE PICKERS
			$('.panel.calendar ' + current_system + ' .finish_date').datepicker("setDate" , start_date);
			$('.panel.calendar ' + current_system + ' .start_date').datepicker("setDate" , finish_date);

			CalendarObject.EventDetails.refresh_date_picker_elements(); 

		},

		set_date_picker_elements_to_today : function() {

			// Check if this is a new event or not
			var current_system = "." + CalendarObject.Globals.current_display_system; 

			// Set the date pickers to today
			$('.panel.calendar ' + current_system + ' .finish_date').datepicker("setDate" , "0");
			$('.panel.calendar ' + current_system + ' .start_date').datepicker("setDate" , "0");

			// Make sure that the user cannot set the FINISH date to be earlier than the START date
			CalendarObject.EventDetails.refresh_date_picker_elements(); 

			// Update the global values to match what is on the pickers
				// CalendarObject.EventDetails.set_global_values_to_match_date_picker_elements(); // THE NATURE OF THE DOUBLE-CALL

		},

		set_date_picker_elements_to_selected_day : function () {
			// If the user is browsing through days, maybe "new event" should default to the day they are browsing, and NOT today

			// Check if this is a new event or not
			var current_system = "." + CalendarObject.Globals.current_display_system; 

			// Create a new date set to the date the user is browsing
			var globals = CalendarObject.Globals; 
			var browsed_date = new Date( globals.current_year , (globals.current_month -1) , globals.current_day , 0 , 0 , 0 , 0 ); 
			// var REFERENCE = new Date(year, month, day, hours, minutes, seconds, milliseconds);

			// Set the date pickers to today
			$('.panel.calendar ' + current_system + ' .finish_date').datepicker("setDate" , browsed_date);
			$('.panel.calendar ' + current_system + ' .start_date').datepicker("setDate" , browsed_date);

			// Make sure that the user cannot set the FINISH date to be earlier than the START date
			CalendarObject.EventDetails.refresh_date_picker_elements(); 

		}, 

		// ---------------------------------------------------------------------------------------------------------
		// TIME PICKERS
		//

		bind_time_picker_elements : function() {

			// We don't check if this is a new event or not, because each system has its own specific binding functions

			// START TIME PICKER
			$('.panel.calendar .display_system .start_time').timepicker({ 
				'timeFormat': 'H:i',
				'scrollDefaultNow'	: true,
				'step'							: 15
			});
			// START TIME CLICK HANDLER
			$('.panel.calendar .display_system .start_time').on('changeTime', function(event) {
				// Update the Globals.start_date object
				var start_time 	= $( ".panel.calendar .display_system .start_time" ).timepicker('getTime');
				CalendarObject.EventDetails.set_start_time_for_current_event(start_time.getHours(), start_time.getMinutes());
				// Set the selected date as the MINIMUM value for the FINISH picker
				CalendarObject.EventDetails.refresh_time_picker_elements(); // Can be NewEvent or EventDetails
				//
				// 
				// Update the LOCAL object for the current event
				CalendarObject.EventDetails.update_event_object(CalendarObject.Globals.current_event_id); 
			});

			//

			// FINISH TIME PICKER
			$('.panel.calendar .display_system .finish_time').timepicker({ 
				'timeFormat': 'H:i',
				'scrollDefaultNow'	: true,
				'step'							: 15,
				'maxTime'						: '23:45',
				'showDuration'			: true
			});
			// FINISH TIME CLICK HANDLER
			$('.panel.calendar .display_system .finish_time').on('changeTime', function() {
				// Update the Globals.finish_date object
				var finish_time 	= $( ".panel.calendar .display_system .finish_time" ).timepicker('getTime');
				CalendarObject.EventDetails.set_finish_time_for_current_event(finish_time.getHours(), finish_time.getMinutes());
				// 
				// Update the LOCAL object for the current event
				CalendarObject.EventDetails.update_event_object(CalendarObject.Globals.current_event_id); 
			});

			//

		}, 

		refresh_time_picker_elements : function() {

			// Check if this is a new event or not
			var current_system = "." + CalendarObject.Globals.current_display_system; 

			// Check to see if the dates match
			// If they DO, then we need to make sure that the user doesn't pick a FINISH time that starts BEFORE the start time...

			var start_date 	= $( ".panel.calendar " + current_system + " .start_date" ).datepicker( "getDate" );
			var finish_date = $( ".panel.calendar " + current_system + " .finish_date" ).datepicker( "getDate" );

			if (start_date.getTime() == finish_date.getTime()) {
				// console.log("The time picker elements are the same!"); 

				// Get the start and end times
				var start_time 	= $( ".panel.calendar " + current_system + " .start_time" ).timepicker('getTime');
				var finish_time = $( ".panel.calendar " + current_system + " .finish_time" ).timepicker('getTime');

				// Check to make sure that the event does NOT finish before it starts!
				if(start_time > finish_time) {
					// Affect the finish_time
					$( ".panel.calendar " + current_system + " .finish_time" ).timepicker('setTime', start_time);
				}

				// Either way, we want to set that value as the MINIMUM date for the FINISH picker
				$( ".panel.calendar " + current_system + " .finish_time" ).timepicker({ 
					'timeFormat'				: 'H:i',
					'step'							: 15,
					'minTime' 					: start_time, 
					'maxTime'						: '23:45',
					'showDuration'			: true
				});

			} // END - if(dates_are_the_same); 
			else {
				//
				console.log("The time picker elements are NOT the same!"); 
				// If the dates are NOT the same, just make sure that the user can pick ANY time available
				$( ".panel.calendar " + current_system + " .finish_time" ).timepicker({ 
					'timeFormat'				: 'H:i',
					'step'							: 15,
					'minTime' 					: 0, 
					'maxTime'						: '23:45',
					'showDuration'			: false
				});

			}

			// 

			// Update the global values to match what is on the pickers
			CalendarObject.EventDetails.set_global_values_to_match_time_picker_elements();

		},

		set_global_values_to_match_time_picker_elements : function() {

			// Check if this is a new event or not
			var current_system = "." + CalendarObject.Globals.current_display_system; 

			// Apply the current values of the START timepicker to the global event object
			var start = $('.panel.calendar ' + current_system + ' .start_time').timepicker("getTime"); 
			CalendarObject.EventDetails.set_start_time_for_current_event( start.getHours(), start.getMinutes() );

			// Apply the current values of the FINISH timepicker to the global event object
			var finish = $('.panel.calendar ' + current_system + ' .finish_time').timepicker("getTime"); 
			CalendarObject.EventDetails.set_finish_time_for_current_event( finish.getHours(), finish.getMinutes() );

		},

		set_time_picker_elements_to_match_global_values : function() {

			// Both the time and date pickers accept a date object
			// REFERENCE : new Date(year, month, day, hours, minutes, seconds, milliseconds)

			// FXFXFX
			var event_object 	= CalendarObject.EventDetails.find_event_object(CalendarObject.Globals.current_event_id); 

			var start_date 		= new Date ( 		event_object.start_year, 
																				event_object.start_month, 
																				event_object.start_day, 
																				event_object.start_hour, 
																				event_object.start_minute, 
																				event_object.start_second
																		);

			var finish_date 		= new Date ( 	event_object.finish_year, 
																				event_object.finish_month, 
																				event_object.finish_day, 
																				event_object.finish_hour, 
																				event_object.finish_minute, 
																				event_object.finish_second
																		);

			// Check if this is a new event or not
			var current_system = "." + CalendarObject.Globals.current_display_system; 

			$( ".panel.calendar " + current_system + " .start_time" ).timepicker('setTime', start_date);
			$( ".panel.calendar " + current_system + " .finish_time" ).timepicker('setTime', finish_date);

			// 

			CalendarObject.EventDetails.refresh_time_picker_elements(); 

		},

		set_time_picker_elements_to_now : function() {

			// Check if this is a new event or not
			var current_system = "." + CalendarObject.Globals.current_display_system; 

			//

			var current_time 		= new Date(); 
			var current_hours 	= current_time.getHours(); 
			var current_minutes = current_time.getMinutes(); 

			// If we're close to the cusp of an hour, increment the hours!
			if(current_minutes > 52) { ++current_hours }

			// Now that we've incremented the hours, if we've passed midnight, return to 0!
			if(current_hours > 23) { current_hours = 0 }

			// Prepare the rounded string!
			var start_time_string = current_hours + ':' + (Math.round(current_minutes/15) * 15) % 60; 

			$('.panel.calendar ' + current_system + ' .start_time').timepicker('setTime', start_time_string);
			$('.panel.calendar ' + current_system + ' .finish_time').timepicker('setTime', start_time_string);

			// Refresh to ensure that everything is going smoothly
			CalendarObject.EventDetails.refresh_time_picker_elements(); // CAN be NewEvent or EventDetails

			// Update the global values to match what is on the pickers
			CalendarObject.EventDetails.set_global_values_to_match_time_picker_elements();

		},

		// 

		update_all_picker_elements_after_a_drag : function(event_id) {

			// If the user has dragged an existing time slice, either to move or scale it, certain properties within the DayView object are affected. 
			// Those properties need to be pushed to the globals, and those values, in turn, need to be applied to the loaded event's details

			// --------------------------------------------------------------------------------
			// XXX

			// Set the date pickers to match the values determined by the time match
			CalendarObject.EventDetails.set_date_picker_elements_to_match_global_values(); 
			CalendarObject.EventDetails.set_time_picker_elements_to_match_global_values(); 

			// Reset our variables
			CalendarObject.DayView.time_slice_was_dragged 		= false; 
			CalendarObject.DayView.time_slice_was_resized 		= false; 

		},

		// ---------------------------------------------------------------------------------------------------------
		// EVENT CUD - ADD ONS , ETC.
		//

		// GGG

		paint_contact_list_element : function(contact_object) { // LLLL - changed data-id to data-contact_id ; i wonder wtf is going on !!!

			// Adds a contact to a loaded event

			var html = 	'<div class="preview_list_element accept_status_' + contact_object['accepted'] 		+ '" ' + 
											'data-contact_id="' 					+ contact_object['id'] 													+ '" ' +
											'data-accepted="' 						+ contact_object['accepted'] 										+ '" ' +
									'>' +
										'<div class="description">' + 
											contact_object['first_name'] + ' ' + contact_object['last_name'] + 
										'</div>' +
									'</div>'; 

			// Determine the appending location
			var current_system = "." + CalendarObject.Globals.current_display_system; 

			// Append the element
			$('.panel.calendar ' + current_system + ' .contact_container').append(html);

		},

		clear_contact_list_elements : function(){
			$('.panel.calendar .display_system .contact_container .preview_list_element').remove(); 
		}, 

		//

		paint_task_list_element : function(task_id, task_description) { // LLLL
			// Adds a contact to a loaded event

			var new_list_element = 		
													'<div class="preview_list_element" data-id="' + task_id + '" >' + 
														task_description + 
													'</div>';

			// Determine the appending location
			var current_system = "." + CalendarObject.Globals.current_display_system; 

			// Append the element
			$('.panel.calendar ' + current_system + ' .task_container').append(new_list_element);

		},

		clear_task_list_elements : function(){
			$('.panel.calendar .display_system .task_container .preview_list_element').remove(); 
		}, 

		//

		paint_note_list_element : function(note_id, note_body) { // HHHH

			// Adds a contact to a loaded event
			var new_note_list_element = 		
													'<div class="preview_list_element" data-id="' + note_id + '" >' + 
														note_body + 
													'</div>';

			// Determine the appending location
			var current_system = "." + CalendarObject.Globals.current_display_system; 

			// Append the element
			$('.panel.calendar ' + current_system + ' .note_container').append(new_note_list_element);

		},

		clear_note_list_elements : function(){
			$('.panel.calendar .display_system .note_container .preview_list_element').remove(); 
		}, 

		//

		initialize : function() {
			CalendarObject.EventDetails.bind_buttons(); 
			CalendarObject.EventDetails.bind_date_picker_elements(); 
			CalendarObject.EventDetails.bind_time_picker_elements(); 
		}

		//

	}; // END - CalendarObject.EventDetails; 



	// ---------------------------------------------------------------------------------------------------------------
	CalendarObject.NewEvent = {
	// ---------------------------------------------------------------------------------------------------------------

		// Relates to the creation of new events
		// Most of these functions deal with the < new_event_system > view
		// That is why they are separate from CalendarObject.EventDetails , even though they share commonalities

		new_event_is_time_matched : 0, 

		// 

		create_empty_event_object : function() {
			// ONLY DO THIS ONCE!!!!

			var globals = CalendarObject.Globals; 
			globals.array_of_event_ids_already_loaded.push( parseInt(0) ); 

			var event_details = {

				"id" 									: 0, 
				"description" 				: null, 
				"location" 						: null, 

				"event_users" 				: [], 
				"event_tasks" 				: [], 
				"event_notes" 				: [], 

				"array_of_user_ids_assigned_to_current_event" 		: [], 
				"array_of_task_ids_assigned_to_current_event" 			: [], 
				"array_of_note_ids_assigned_to_current_event" 			: [], 

				"array_of_user_ids_loaded_from_current_event" 		: [], 
				"array_of_task_ids_loaded_from_current_event" 			: [], 
				"array_of_note_ids_loaded_from_current_event" 			: [], 

				"start_year" 					: null, 
				"start_month" 				: null, 
				"start_day" 					: null, 
				"start_hour" 					: null, 
				"start_minute" 				: null, 
				"start_second" 				: null, 

				"finish_year" 				: null, 
				"finish_month" 				: null, 
				"finish_day" 					: null, 
				"finish_hour" 				: null, 
				"finish_minute" 			: null, 
				"finish_second" 			: null, 

			};

			// Push the OBJECT into the right array
			globals.array_of_events_already_loaded.push(event_details); 

		}, 

		// 

		new_event : function() {

			// Prepare everything for the creation of a new event
			// This does NOT interface with the database - it prepares the API and clears variables

			// Toggle the headers
			$('.panel.calendar .header.main.default').hide();
			$('.panel.calendar .header.main.cancel').show(); 

			// Event is NOT time matched
			CalendarObject.NewEvent.new_event_is_time_matched = 0; 

			// Hide the helper pane
			$('.panel.calendar .display_system .far_right_panel').hide(); 
			// Make the event details hidden - TODO : fix this up later
			$('.panel.calendar .display_system .right_panel').hide(); 

			// De-select stuff
			$('.panel.calendar .display_system .day_view_time_map .calendar_time_slice.selected').removeClass('selected');
			$('.panel.calendar .display_system .event_list .preview_list_element.selected').removeClass('selected');

			// Check for any existing "new_event" elements
			if($('.new_event_element')[0]) {
				alert("Save your current event before creating a new one!");
				// Optionally, auto-save, and THEN create a new task
			}
			else {

				console.log("there are no new events in the DOM. Creating one now...");

				// Just in case the user is editing a task, and clicks on new_task
					//CalendarObject.EventDetails.auto_save();

				// Clear all detail fields
				CalendarObject.EventDetails.clear_new_event_details();

				// Prepare the current_event ID
				CalendarObject.Globals.current_event_id = 0; // Detected as "new" in the save_event() function

				// --------------------------------------------------------------------------------

				// Set the date pickers to "today", to save the user a few clicks
				// CalendarObject.EventDetails.set_date_picker_elements_to_today(); // PERHAPS - orrrrr
				
				// Set the date pickers to the day that the user is currently broswing - perhaps a little less confusing for the user?
				CalendarObject.EventDetails.set_date_picker_elements_to_selected_day(); 

				CalendarObject.EventDetails.set_time_picker_elements_to_now(); 

				// Focus on the textArea
				$('.panel.calendar .new_event_system .event_details .description textarea').focus();

				// --------------------------------------------------------------------------------

				// Create new event list elements in the sidebar
				CalendarObject.MonthEventList.create_event_dom_elements(); 

				//

			}

		}, // END - new_event()

		// 

		new_event_from_drag : function() {

			// Toggle the headers
			$('.panel.calendar .header.main.default').hide();
			$('.panel.calendar .header.main.cancel').show(); 

			// Event is NOT time matched
			CalendarObject.NewEvent.new_event_is_time_matched = 0; 

			// Hide the helper pane
			$('.panel.calendar .display_system .far_right_panel').hide(); 
			// Make the event details hidden
			$('.panel.calendar .display_system .right_panel').hide(); 

			// Deselect any selected time slice
			$('.panel.calendar .display_system .day_view_time_map .calendar_time_slice.selected').removeClass('selected');

			// Check for any existing "new_event" elements
			if($('.new_event_element')[0]) {
				$('.new_event_element').remove(); 
			}

			// 

			// Clear all detail fields
			CalendarObject.EventDetails.clear_new_event_details();

			// Prepare the current_event ID
			CalendarObject.Globals.current_event_id = 0; // Detected as "new" in the save_event() function

			// --------------------------------------------------------------------------------

			// Set the global values to match what was dragged
			// The year, month and day are what is currently selected in the day view - i.e. the global "current" values
			// The hour, minute and second are derived from variables in day view

			// XXXX

			var new_time_slice 				= $('.panel.calendar .display_system .calendar_time_map .calendar_time_slice[data-id="0"]');

			var event_start_time 			= new_time_slice.attr('data-start_time'); 
			var event_start_hour 			= event_start_time.substr(0, 2); 
			var event_start_minute 		= event_start_time.substr(3, 2); 

			var event_finish_time 		= new_time_slice.attr('data-finish_time'); 
			var event_finish_hour 		= event_finish_time.substr(0, 2); 
			var event_finish_minute 	= event_finish_time.substr(3, 2); 

			// Apply data to the event_object 

			var event_object = CalendarObject.EventDetails.find_event_object(0); 

			event_object.start_year 				= CalendarObject.Globals.current_year 			; 
			event_object.start_month 				= CalendarObject.Globals.current_month 			; 
			event_object.start_day 					= CalendarObject.Globals.current_day 				; 
			event_object.start_hour 				= event_start_hour 													; 
			event_object.start_minute 			= event_start_minute 												; 
			event_object.start_second 			= 0 																				; 

			event_object.finish_year 				= CalendarObject.Globals.current_year 			; 
			event_object.finish_month 			= CalendarObject.Globals.current_month 			; 
			event_object.finish_day 				= CalendarObject.Globals.current_day 				; 
			event_object.finish_hour 				= event_finish_hour 												; 
			event_object.finish_minute 			= event_finish_minute 											; 
			event_object.finish_second 			= 0 																				; 

			console.log("event_object - " , event_object);

			// --------------------------------------------------------------------------------

			// Set the date pickers to match the values determined by the time match
			CalendarObject.EventDetails.set_date_picker_elements_to_match_global_values(); 
			CalendarObject.EventDetails.set_time_picker_elements_to_match_global_values(); 

			// Focus on the textArea
			$('.panel.calendar .new_event_system .event_details .description textarea').focus();

			// --------------------------------------------------------------------------------
			// XXXX
			// Create a new event list element in the sidebar
			CalendarObject.MonthEventList.create_event_dom_elements(); 

			//

		}, // END - new_event_from_drag()

		// 

		prepare_for_new_event_from_time_match : function() { // BNX

			// Time match is a little bit more complicated than other new event processes
			// It requres a two-part preparation because it takes place across three different systems

			// Animate the window width
			$('.panel.calendar').animate({'width' : '935px' } , 'normal' );
			// $('.panel.calendar').css('width', '935px'); 

			// Clear any new event details that may be filled in
			CalendarObject.EventDetails.clear_new_event_details();

			// Clear the list of contacts already selected for time match from a previous time match
			CalendarObject.TimeMatch.array_of_contacts_selected_for_time_match.length = 0; 

			// Remove any DOM contact objects
			$('.panel.calendar .selected_contact_list .preview_list_element').remove();

		}, 

		new_event_from_time_match : function(target_element) {

			// Make sure that the window width is back to normal
			// $('.panel.calendar').animate({'width' : '1100px' } , 'fast' ); - TODO : fix up animation - it's weird now. 
			$('.panel.calendar').css('width', '1100px'); 

			// Event IS time matched
			CalendarObject.NewEvent.new_event_is_time_matched = 1; 

			// Prepare everything for the creation of a new event based on the results of a time match
			// This does NOT interface with the database - it prepares the API and clears variables

			// Hide the helper pane
			$('.panel.calendar .display_system .far_right_panel').hide(); 
			// Make the event details hidden - TODO : fix this up later
			$('.panel.calendar .display_system .right_panel').hide(); 

			// Make the event details visible
			$('.panel.calendar .time_match_system .right_panel').show(); 

			// Visually de-select any selected event
			$('.panel.calendar .display_system .day_view_time_map .calendar_time_slice.selected').removeClass('selected');

			// Check for any existing "new_event" elements
			if($('.new_event_element')[0]) {
				//alert("Save your current event before creating a new one!");
				// Optionally, auto-save, and THEN create a new task
				// --------------------------
				// For now, destroy the event
				$('.new_event_element').remove(); 
				// TODO - 
				// When the user clicks the time_match button, the system checks for unsaved new events
				// and automatically saves them. 
			}

			console.log("there are no new tasks in the DOM. Creating one now...");

			// Just in case the user is editing a task, and clicks on new_task
				//CalendarObject.EventDetails.auto_save();

			// Prepare the current_event ID
			CalendarObject.Globals.current_event_id = 0; // Detected as "new" in the save_event() function

			// ---------------------------------------------------------------------------------
			// Apply data to the event_object 

			var event_object = CalendarObject.EventDetails.find_event_object(0); 

			event_object.start_year 				= $(target_element).attr('data-start_year') 					; 
			event_object.start_month 				= $(target_element).attr('data-start_month') 					; 
			event_object.start_day 					= $(target_element).attr('data-start_day') 						; 
			event_object.start_hour 				= $(target_element).attr('data-start_hour') 					; 
			event_object.start_minute 			= $(target_element).attr('data-start_minute') 				; 
			event_object.start_second 			= $(target_element).attr('data-start_second') 				; 

			event_object.finish_year 				= $(target_element).attr('data-finish_year') 					; 
			event_object.finish_month 			= $(target_element).attr('data-finish_month') 				; 
			event_object.finish_day 				= $(target_element).attr('data-finish_day') 					; 
			event_object.finish_hour 				= $(target_element).attr('data-finish_hour') 					; 
			event_object.finish_minute 			= $(target_element).attr('data-finish_minute') 				; 
			event_object.finish_second 			= $(target_element).attr('data-finish_second') 				; 

			console.log("event_object - " , event_object);

			// ---------------------------------------------------------------------------------

			CalendarObject.Navigation.switch_to_system("new_event");

			// The contacts selected for time match are assigned to the global array. 
			// Set the global ararys to match what was selected by the user in TimeMatch
			event_object.array_of_user_ids_assigned_to_current_event = 
			event_object.array_of_user_ids_loaded_from_current_event = 
				CalendarObject.TimeMatch.array_of_contacts_selected_for_time_match.slice(0);

			// Visually display the contacts involved in this (NEW) event
			CalendarObject.Contacts.bind_event_to_contacts(0);

			// ---------------------------------------------------------------------------------

			// Set the date pickers to match the values determined by the time match
			CalendarObject.EventDetails.set_date_picker_elements_to_match_global_values(); 
			CalendarObject.EventDetails.set_time_picker_elements_to_match_global_values(); 

			// ---------------------------------------------------------------------------------

			// Create a new event list element in the sidebar
			CalendarObject.MonthEventList.create_event_dom_elements(); 

			// ---------------------------------------------------------------------------------

			// Focus on the textArea
			$('.panel.calendar .new_event_system .event_details .description textarea').focus();

			//

		}, // END - new_event_from_time_match

		// 

		create_event : function () {

			console.log("creating new event");

			// ---------------------------------------------------------------------------------------------------------------

			// Toggle the headers
			$('.panel.calendar .header.main.cancel').hide(); 
			$('.panel.calendar .header.main.default').show();

			// ---------------------------------------------------------------------------------------------------------------

			// If there are any inform panels, remove them
			CalendarObject.DayEventList.remove_all_day_list_informers(); 

			// Make sure that the event model is set to the latest value of the GLOBALS
			// TODO : - errors may come from here - might need to set the event details to match the time slice that we just created
			CalendarObject.EventDetails.refresh_event_model(0);

			// ---------------------------------------------------------------------------------------------------------------
			// TODO - update the event_object first, and THEN save ... 
				// for now, we still need it to pull arrays of contacts/tasks/notes attached to a new event at creation 

			var event_object = CalendarObject.EventDetails.find_event_object(0); 

			// ---------------------------------------------------------------------------------------------------------------
			// EVENT DESCRIPTION

			var event_description 	= $('.panel.calendar .new_event_system .event_details .description textarea').val(); 
			var location 						= $('.panel.calendar .new_event_system .event_details .location').val();
			var start_time 					= Event_Model.get_start_datetime(); 
			var finish_time 				= Event_Model.get_finish_datetime(); 

			var start_object 				= Event_Model.get_start_datetime_object(); 		// In case we are creating a new event NOT from drag
			var finish_object 			= Event_Model.get_finish_datetime_object(); 

			var is_timematched 			= CalendarObject.NewEvent.new_event_is_time_matched; // MMMM

			// ---------------------------------------------------------------------------------------------------------------
			// EVENT USERS

			var event_users = event_object.array_of_user_ids_assigned_to_current_event; 

			// push the current user into the array - TODO : make this safer - 
			event_users.push(GLOBAL_USER_ID); 

			console.log("event_users - ", event_users); 

			// ---------------------------------------------------------------------------------------------------------------
			// EVENT TASKS

			// var event_tasks = []; 
			var event_tasks = event_object.array_of_task_ids_assigned_to_current_event; 

			// ---------------------------------------------------------------------------------------------------------------
			// EVENT NOTES

			// var event_notes = []; 
			var event_notes = event_object.array_of_note_ids_assigned_to_current_event; 

			// ---------------------------------------------------------------------------------------------------------------
			// EVENT DATA // PPPP

			var data = { 

				"action" 						: "CREATE_EVENT",
				"credentials" 			: CREDENTIALS_OBJECT, // user authentication

				"Event" 						: {
					"user_id" 				: GLOBAL_USER_ID, 
					"is_timematched" 	: is_timematched, 
					"event_type_id" 	: 1, // event = 1 ; deadline = 2
					"description" 		: event_description,
					"start" 					: start_time,
					"finish" 					: finish_time,
					"location" 				: location,
				}, 

				// UNCOMMENTING THESE LINES WILL CREATE EMPTY NOTES / TASKS
				/*
				"Task" 							: {
					// any NEW task you want to make
					"description" 		: null
				}, 

				"Note" 							: {
					// any NEW note you want to make
					"body" 						: null
				}, 
				*/ 

				"EventTasks" 				: event_tasks, 			// SLOPPY - had to fix a bug in the API from Simon. It was performing strange binds before the fix. 

				"EventNotes" 				: event_notes, 			// array of note ids to be bound to the event. 

				"EventUsers" 				: event_users

			};

			// --------------------------

			console.log(data);
			
			$.post(API_PHP_URL + 'api.php', data, function(responseText){
				try {

					console.log(responseText);

					// Get the newly created event's ID
					var event_object = JSON.parse(responseText);
					console.log("event_object - " , event_object); 

					// MISSING FROM API - 
					//var event_id = event_object.Event.id; //console.log(event_id);
					var event_id = event_object.id; //console.log(event_id);

					// ------------------------------------------------------------------------------------------------

					// Switch to the correct month/year in the month view, so that we add to the correct event list!
					CalendarObject.Globals.current_year 		= parseInt( event_object['start'].substr(0, 4) );
					CalendarObject.Globals.current_month 		= parseInt( event_object['start'].substr(5, 2) );
					CalendarObject.MonthView.refresh_month_view();

					// ------------------------------------------------------------------------------------------------
					// HANDLE THE VISUAL UPDATING OF THE SIDE BUTTON PREVIEW TEXT

					// We Assign the ID to the current_task property 
					// We are, after all, "selecting" the freshly created task. 
					// ALSO this fixes a bug where we create the task multiple times!
					CalendarObject.Globals.current_event_id = event_id;

					// EITHER WAY, WE WANT TO DO THIS TO CONFIGURE THE NEWLY CREATED BUTTON
					// When you click the newly created task, you want to bring up the correct data!
					$('.panel.calendar .new_event_element').attr('data-id', event_id);

					// Change the title of the button // KKK
					$('.panel.calendar .new_event_element .description').html(event_description);

					// Remove the "new_task" class from the element, to prevent it from being assigned twice
					$('.panel.calendar .new_event_element').removeClass('new_event_element');

					// ------------------------------------------------------------------------------------------------
					// Re-bind all of the elements

					// BIND MONTH VIEW
					CalendarObject.MonthEventList.bind_all_event_list_elements(); 

					// BIND BOOKMARKS
					CalendarObject.DayEventList.bind_all_event_list_elements(); 

					// ------------------------------------------------------------------------------------------------
					// UPDATE THE TIME SLICE WE MADE

					// Check if we have made a time slice from a drag. 
					if( $('.panel.calendar .display_system .calendar_time_map .calendar_time_slice[data-id="0"]')[0] ){
					// If we HAVE, then we just need to update it
						$('.panel.calendar .display_system .calendar_time_map .calendar_time_slice[data-id="0"] .description').html(event_description);
						$('.panel.calendar .display_system .calendar_time_map .calendar_time_slice[data-id="0"]').attr('data-id', event_id);
					}
					else {
					// If we have NOT created the time slice, we need to draw one to the screen, stat!

					// PPP
					// TODO - 
					// There seems to be an error related to THIS exact code right here!
					// Not sure exactly what is causing it, but I suspect it has something to do with start_object and finish_object!

					// UPDATE : 
					// I think what was causing the bug is this : 
					// The start_object and finish_object were returning "0" instead of "00"
					// This was truncating the time, and creating false values in our drags
					// Because of the truncation, == operators did not work properly
					// Causing fucked up drags. 
					// This... i THIIIIINK ... has been fixed now that I have formatted things properly!

					// TODO - don't forget to format the TASK_MODEL.js file as well. 

						// TODO - refactor this after Simon gives you a proper API return
						var time_slice_data = CalendarObject.DayView.calculate_time_slice_data(	start_object.hour, 
																																										start_object.minute, 
																																										finish_object.hour, 
																																										finish_object.minute
																																					); 

						// ------------------------------------------------------------------------------------------------

						var offset = CalendarObject.DayView.calculate_time_bar_offset(time_slice_data.event_start_time);

						// ------------------------------------------------------------------------------------------------
						// Determine the acceptance status of the event

						if(event_users.length > 1){
							// More than one user involved - odds are that they did NOT accept the event immediately upon creation!
							var all_accepted = false; 
						} 
						else {
							var all_accepted = true;
						}

						//

						// QQ
						var time_slice_data_object = {
							'event_id' 							: event_id, 														// id
							'description' 					: event_description, 										// description
							'offset_top' 						: offset.top, 													// margin-top
							'total_slices' 					: time_slice_data.total_slices, 				// used for height
							'start_time' 						: time_slice_data.event_start_time, 		// 
							'finish_time' 					: time_slice_data.event_finish_time, 		// 
							'created_by_user' 			: true, 																// created_by_user ? obviously!
							'user_accepted' 				: true, 																// accepted_by_user? obviously!
							'all_accepted' 					: all_accepted, 												// accepted_by_others ? not sure // MMMM
							'is_timematched' 				: is_timematched 												// is_timematched ? well it COULD be but... JJJJ - need to think here!
						}; 

						var time_slice = CalendarObject.DayView.paint_time_slice(time_slice_data_object); 

						$('.panel.calendar .display_system .calendar_time_map .calendar_time_slice_grid').append(time_slice); 

					}

					// BIND TIME SLICES
					CalendarObject.DayView.bind_all_time_slices(); 

					// ------------------------------------------------------------------------------------------------
					// Load the event details after the event has been created

					console.log("Loading newly created event - ", event_id); 
					// PPP
					// There are probably bugs coming from here - 
					// TODO : 
					// if new event was created, load_event_details() does not override the time slice
					// ALSO - need the time slice to UPDATE the fuckin' object

					//alert("STOP"); 

					CalendarObject.EventDetails.load_event_details(event_id); 

				} catch(e) {
					alert("Unknown error "+ e +".");
					return;
				}
			});

		}, // END - create_event function()

		//
		// BUTTONS
		//

		bind_buttons : function() {
		// Binds all of the buttons on the new_event_system

			// CANCEL
			$('.panel.calendar .new_event_system .header .cancel').unbind();
			$('.panel.calendar .new_event_system .header .cancel').bind('tap click', function(event){
				CalendarObject.Navigation.switch_to_system("display");
				alert("Cleaning up new event that was not saved!");
				CalendarObject.EventDetails.delete_event(CalendarObject.Globals.current_event_id);
				//
			});

			// CREATE NEW EVENT
			$('.panel.calendar .new_event_system .header .create').unbind();
			$('.panel.calendar .new_event_system .header .create').bind('tap click', function(event){
				// 
				CalendarObject.NewEvent.create_event();
				console.log("Called - create_event()");
				CalendarObject.Navigation.switch_to_system("display");
				//
			});

			// ADD NOTE 
			$('.panel.calendar .new_event_system .add_note_button').unbind();
			$('.panel.calendar .new_event_system .add_note_button').bind('tap click', function(event){
				//
				var note_value = $('.panel.calendar .new_event_system  .add_note_input').val(); 
				console.log(note_value);
				//
			});

		}, // END - bind_buttons()

		bind_date_picker_elements : function() {

			// START DATE PICKER
			$('.panel.calendar .new_event_system .start_date').datepicker({
				onClose: function(dateText, inst) {
					// Update the Globals.start_date object
					CalendarObject.EventDetails.set_start_date_for_current_event(inst.currentYear, inst.currentMonth, inst.currentDay);
					// Set the selected date as the MINIMUM value for the FINISH picker
					CalendarObject.EventDetails.refresh_date_picker_elements(); 
				}, 
			});

			// FINISH DATE PICKER
			$('.panel.calendar .new_event_system .finish_date').datepicker({
				onClose: function(dateText, inst) {
					// Update the Globals.start_date object
					CalendarObject.EventDetails.set_finish_date_for_current_event(inst.currentYear, inst.currentMonth, inst.currentDay);
				}
			});

		},

		bind_time_picker_elements : function() {

			// START TIME PICKER
			$('.panel.calendar .new_event_system .start_time').timepicker({ 
				'timeFormat': 'H:i',
				'scrollDefaultNow'	: true,
				'step'							: 15
			});
			// START TIME CLICK HANDLER
			$('.panel.calendar .new_event_system .start_time').on('changeTime', function(event) {
				// Update the Globals.start_date object
				var start_time 	= $( ".panel.calendar .new_event_system .start_time" ).timepicker('getTime');
				CalendarObject.EventDetails.set_start_time_for_current_event(start_time.getHours(), start_time.getMinutes());
				// Set the selected date as the MINIMUM value for the FINISH picker
				CalendarObject.EventDetails.refresh_time_picker_elements(); 
				//
			});

			//

			// FINISH TIME PICKER
			$('.panel.calendar .new_event_system .finish_time').timepicker({ 
				'timeFormat': 'H:i',
				'scrollDefaultNow'	: true,
				'step'							: 15,
				'maxTime'						: '23:45',
				'showDuration'			: true
			});
			// FINISH TIME CLICK HANDLER
			$('.panel.calendar .new_event_system .finish_time').on('changeTime', function() {
				// Update the Globals.finish_date object
				var finish_time 	= $( ".panel.calendar .new_event_system .finish_time" ).timepicker('getTime');
				CalendarObject.EventDetails.set_finish_time_for_current_event(finish_time.getHours(), finish_time.getMinutes());
			});

			//

		}, 

		//

		initialize : function() {
			CalendarObject.NewEvent.create_empty_event_object(); // a DOM object used to store data when creating NEW events. 
			CalendarObject.NewEvent.bind_buttons(); 
			CalendarObject.NewEvent.bind_date_picker_elements(); 
			CalendarObject.NewEvent.bind_time_picker_elements(); 
		}

		// 

	};



	// ---------------------------------------------------------------------------------------------------------------
	CalendarObject.TimeMatch = {
	// ---------------------------------------------------------------------------------------------------------------

		// PROPERTIES

		array_of_contacts_selected_for_time_match: [], 


		// TODO - we will want time match to display our list of contats - will need to store shit somewhere... but that's another story


		// FUNCTIONS

		create_selected_contact_list_element: function (contact_id, contact_name) {

			// Create a new element for the contact inside the "selected_contact_list" div
			// This visually indicates the contacts that are selected for an event 

			// Check if contact has already been added to time match
			var is_contact_already_added = 
				jQuery.inArray(contact_id, CalendarObject.TimeMatch.array_of_contacts_selected_for_time_match);

			if(is_contact_already_added != -1){
				console.log("Contact has already been added to TimeMatch");
			}
			else {

				// Add the contact to array_of_contacts_selected_for_time_match
				CalendarObject.TimeMatch.array_of_contacts_selected_for_time_match.push(contact_id);

				// Create the element in the DOM 
				var new_selected_contact_list_element = 		
														'<div class="preview_list_element selected" data-id="' + contact_id + '" >' + 
															contact_name + 
														'</div>';

				$('.panel.calendar .time_match_system .selected_contact_list').append(new_selected_contact_list_element);

				// Re-bind everything, so that our list elements work properly
				CalendarObject.TimeMatch.bind_all_selected_contact_list_elements();

				// ----------------------------------------------------------------------
				// Add the user to our local event object				// BNX
				var event_object = CalendarObject.EventDetails.find_event_object(0); 

				// Create a pseudo contact object
				var contact_object = { 
					"user_id" 				: contact_id, 
					"first_name" 			: contact_name, 
					"last_name" 			: "" // this is a shameless hack
				}

				// Push it to our array
				event_object.event_users.push(contact_object); 

			}

		}, // END - create_selected_contact_list_element()

		destroy_selected_contact_list_element: function(contact_id) { 

			// Remove the user-id from the array
			CalendarObject.TimeMatch.array_of_contacts_selected_for_time_match.remove_value_from_array(contact_id);

			// Remove the object from the DOM
			var list_selector = 	$('.panel.calendar .selected_contact_list ' + 
															'.preview_list_element[data-id=' + contact_id + ']');
			$(list_selector).remove();

			// ----------------------------------------------------------------------
			// Remove the user to our local event object				// BNX
			var event_object = CalendarObject.EventDetails.find_event_object(0); 

			// Hunt down the user_id and remove it from our array
			for ( var i = 0 ; i < event_object.event_users.length ; i++ ){
				// If found, remove it from our array
				if( parseInt(event_object.event_users[i]['user_id']) == contact_id ){
					event_object.event_users.splice(i, 1); 
					console.log("found object"); 
					break;
				}
			} // END - for()

		},

		//

		request_time_match: function() {

			// This will send a request to the server for a time match
			console.log("People Involved - ", CalendarObject.TimeMatch.array_of_contacts_selected_for_time_match); 
			console.log("Time Required - ", $('.panel.calendar .time_match_system .duration_input').val()); 

			// This is where we will call the server
			CalendarObject.TimeMatch.time_match(); 

			// Show loader
			$('.panel.calendar .time_match_system .right_panel .load_overlay').show(); 

		},

		//

		time_match : function() {

			var current_date = new Date(); 

			var data = {

				"action"			: "TIMEMATCH",
				"credentials" : CREDENTIALS_OBJECT, // user authentication

				"year"				: current_date.getFullYear(), 		//CalendarObject.Globals.current_year,
				"month"				: current_date.getMonth() + 1, 		//CalendarObject.Globals.current_month,
				"day"					: current_date.getDate(), 				//CalendarObject.Globals.current_day,
				"user_id"			: GLOBAL_USER_ID, 
				"other_users"	: CalendarObject.TimeMatch.array_of_contacts_selected_for_time_match, 

				"min_hour" 		: $('.panel.calendar .time_match_system .min_range').timepicker('getTime').getHours(),
				"max_hour" 		: $('.panel.calendar .time_match_system .max_range').timepicker('getTime').getHours(),
				"duration" 		: $('.panel.calendar .time_match_system .duration_input').timepicker('getTime').getHours()

				// GGG

			}

			console.log ("data sent - " , data); 

			$.post(API_PHP_URL + 'api.php', data, function(responseText){
				try {
					console.log(responseText);

					// Parse the time match results
					var timematches = JSON.parse(responseText);

					// Process the results and output them to the user's screen 
					var results_container_html = CalendarObject.TimeMatch.paint_available_time_match_container(timematches); 
					$('.panel.calendar .time_match_system .available_times').html(results_container_html);

					// bind event : view more times
					$('.panel.calendar .view_more_times').unbind();
					$('.panel.calendar .view_more_times').bind('tap click', function(event) {
						console.log("will display more times"); 
					});

					// Bind - Clicking on a time match result
					$('.panel.calendar .time_match_system .available_times .preview_list_element').unbind();
					$('.panel.calendar .time_match_system .available_times .preview_list_element').bind('tap click', function(event) {
						console.log("clicked on = " , event.currentTarget);
						CalendarObject.NewEvent.new_event_from_time_match(event.currentTarget);
					});

					// Hide loader after all is loaded
					$('.panel.calendar .time_match_system .right_panel .load_overlay').fadeOut(FADE_OUT_SPEED); 
					
				} catch(e) {
					alert("Unknown error "+ e +".");
					return;
				}
			});

		},

		//

		paint_available_time_match : function(timeslice) {

			var label = timeslice['start']['formatted_date'];
			var timeslice_range = timeslice['start']['formatted_time'] + ' to ' + timeslice['finish']['formatted_time'];

			var html = 

				'<div class="preview_list_element" ' +
					'data-start_year="' 		+ timeslice['start']['year'] + 		'"' + 
					'data-start_month="' 		+ timeslice['start']['month'] + 	'"' +
					'data-start_day="' 			+ timeslice['start']['day'] + 		'"' +
					'data-start_hour="' 		+ timeslice['start']['hour'] + 		'"' +
					'data-start_minute="' 	+ timeslice['start']['minute'] + 	'"' +
					'data-start_second="' 	+ timeslice['start']['second'] + 	'"' +

					'data-finish_year="' 		+ timeslice['finish']['year'] + 	'"' +
					'data-finish_month="' 	+ timeslice['finish']['month'] + 	'"' +
					'data-finish_day="' 		+ timeslice['finish']['day'] + 		'"' +
					'data-finish_hour="' 		+ timeslice['finish']['hour'] + 	'"' +
					'data-finish_minute="' 	+ timeslice['finish']['minute'] + '"' +
					'data-finish_second="' 	+ timeslice['finish']['second'] + '"' +
				'>' +

					'<div class="description">' + 
						'<span class="property">' + label + '</span>' + 
						'<br/>' + 
						'<span class="value">' + timeslice_range +'</span>' +
					'</div>' + 

				'</div>'; // FFFFF

			return html;

		},

		paint_available_time_match_list : function(timeslices) {

			console.log(timeslices);
			var html = '';
			var total_slices = timeslices.length;

			for ( var i = 0; i < total_slices; i++ ){
				html += CalendarObject.TimeMatch.paint_available_time_match(timeslices[i]);
				// console.log(html);
			}

			// console.log("final html result - " , html); 
			return html;

		}, 

		paint_available_time_match_container : function(timematches) {

			var html_match_options =
				CalendarObject.TimeMatch.paint_available_time_match_list(timematches);

			var html_view_more = 
				'<div class="details_category_element view_more_times" data-id="' + 'filler' + '">' +
					'<p>View More Available Times...</p> ' +
				'</div>';

			// COMBINE THEM ALL!
			var html =
				html_match_options; 
				// html_view_more;

			return html; 

		},

		// 
		// BUTTONS
		//

		bind_buttons : function (){

			// CANCEL
			$('.panel.calendar .time_match_system .cancel').unbind();
			$('.panel.calendar .time_match_system .cancel').bind('tap click', function(event){
				CalendarObject.Navigation.switch_to_system("display");
				// Make sure that the window width is back to normal
				$('.panel.calendar').animate({'width' : '1100px' } , 'normal' );
				//$('.panel.calendar').css('width', '1100px'); 
			}); 

			// Find Available Times - ( Query a Time Match )
			$('.panel.calendar .time_match_system .find_available_times').unbind();
			$('.panel.calendar .time_match_system .find_available_times').bind('tap click', function(event){
				// Check that there are users
				if (CalendarObject.TimeMatch.array_of_contacts_selected_for_time_match.length > 0){
					CalendarObject.TimeMatch.request_time_match();
				} else {
					alert("please select at least one other person for time match"); 
				}
			}); 

			// Find Available Times - ALTERNATE
			$('.panel.calendar .time_match_system .go').unbind();
			$('.panel.calendar .time_match_system .go').bind('tap click', function(event){
				// Check that there are users
				if (CalendarObject.TimeMatch.array_of_contacts_selected_for_time_match.length > 0){
					CalendarObject.TimeMatch.request_time_match();
				} else {
					alert("please select at least one other person for time match"); 
				}
			});

		}, 

		bind_all_contact_list_elements: function() {
			// Clicking on a contact from the contact_list in the left panel will create a duplicate of that contact
			// in the "selected_contact_list" div; 
			// This indicates to the user which users have been selected to engage in time match
			$('.panel.calendar .time_match_system .contact_list .preview_list_element').unbind();
			$('.panel.calendar .time_match_system .contact_list .preview_list_element').bind('tap click', function(event){
				//console.log("clicked to create");
				var contact_id = $(event.currentTarget).attr('data-contact_id');
				var contact_name = $(event.currentTarget).html();
				CalendarObject.TimeMatch.create_selected_contact_list_element(contact_id, contact_name);
			});
		},

		bind_all_selected_contact_list_elements: function() {
			// Clicking on a contact that has already been selected will remove that contact from the "selected_contact_list" div
			$('.panel.calendar .time_match_system .selected_contact_list .preview_list_element').unbind();
			$('.panel.calendar .time_match_system .selected_contact_list .preview_list_element').bind('tap click', function(event){
				//console.log("clicked to destroy");
				var contact_id = $(event.currentTarget).attr('data-id');
				CalendarObject.TimeMatch.destroy_selected_contact_list_element(contact_id);
			});
		}, 

		//

		bind_time_match_duration_element : function() {
			// START TIME PICKER
			$('.panel.calendar .time_match_system .duration_input').timepicker({ 
				'timeFormat': 'H:i',
				'scrollDefaultNow'	: true,
				'step'							: 60, 
				'maxTime' 					: '4:00'
			});
			// START TIME CLICK HANDLER
			$('.panel.calendar .time_match_system .duration_input').on('changeTime', function(event) {
				console.log( $('.panel.calendar .time_match_system .duration_input').timepicker('getTime').getHours() );
			});

		},

		bind_range_picker_elements : function() {

			// MIN TIME PICKER
			$('.panel.calendar .time_match_system .min_range').timepicker({ 
				'timeFormat': 'H:i',
				'scrollDefaultNow'	: true,
				'step'							: 60
			});
			// MIN TIME CLICK HANDLER
			$('.panel.calendar .time_match_system .min_range').on('changeTime', function(event) {
				// Set the selected date as the MINIMUM value for the FINISH picker
				CalendarObject.TimeMatch.refresh_range_picker_elements(); 
				//
			});

			// MAX TIME PICKER
			$('.panel.calendar .time_match_system .max_range').timepicker({ 
				'timeFormat': 'H:i',
				'scrollDefaultNow'	: true,
				'step'							: 60,
				'maxTime'						: '23:00',
				'showDuration'			: true
			});
			// MAX TIME CLICK HANDLER
			$('.panel.calendar .time_match_system .max_range').on('changeTime', function() {
				// 
			});

		},

		refresh_range_picker_elements : function() {

			// Get the start and end times
			var min_range 	= $( ".panel.calendar .time_match_system .min_range" ).timepicker('getTime');
			var max_range 	= $( ".panel.calendar .time_match_system .max_range" ).timepicker('getTime');

			// Check to make sure that the event does NOT finish before it starts!
			if(min_range > max_range) {
				// Affect the max_range
				// TODO : 
				// Technically, this needs to be GREATER than 0, so it would be the min_range + 1, but whatever
				$( ".panel.calendar .time_match_system .max_range" ).timepicker('setTime', min_range);
			}

			// Either way, we want to set that value as the MINIMUM date for the FINISH picker
			$( ".panel.calendar .time_match_system .max_range" ).timepicker({ 
				'timeFormat'				: 'H:i',
				'step'							: 60,
				'minTime' 					: min_range, 
				'maxTime'						: '23:00',
			});

			// 

			// Update the global values to match what is on the pickers
				// CalendarObject.EventDetails.set_global_values_to_match_time_picker_elements();

		},

		//

		initialize : function() {
			CalendarObject.TimeMatch.bind_buttons();
			CalendarObject.TimeMatch.bind_all_contact_list_elements();
			CalendarObject.TimeMatch.bind_time_match_duration_element(); 
			CalendarObject.TimeMatch.bind_range_picker_elements(); 
		}

	//

	}; // END - CalendarObject.TimeMatch



	// ---------------------------------------------------------------------------------------------------------------
	CalendarObject.Contacts = { 
	// ---------------------------------------------------------------------------------------------------------------


		bind_dialog_window : function() {

			$( ".dialog_window.add_contact_to_event" ).dialog({
				resizable: false,
				height:300,
				width:500,
				modal: true,
				autoOpen: false,
				buttons: {
					Cancel: function() {
						var event_id = CalendarObject.Globals.current_event_id; // set this now!
						CalendarObject.Contacts.revert_to_original_binding(event_id); 
						$( this ).dialog( "close" );
					},
					"Accept": function() { 
						var event_id = CalendarObject.Globals.current_event_id; // set this now!
						CalendarObject.Contacts.bind_event_to_contacts(event_id); 
						$( this ).dialog( "close" );
					}
				} // END - buttons {}
			}); // END - dialog(); 

		},

		open_dialog_window : function() {
			// Refresh the list of contacts that are attached to this event
			CalendarObject.Contacts.refresh_list_of_selected_contacts(CalendarObject.Globals.current_event_id); // HHHH
			// Open the window
			$( ".dialog_window.add_contact_to_event" ).dialog( "open" ); 
		}, 

		// 

		bind_event_to_contacts : function(event_id) {

			var event_object 	= CalendarObject.EventDetails.find_event_object(event_id);

			// Check for a NEW event
			if(event_id == 0){

				// Clean up any existing elements to avoid duplicates
				$('.panel.calendar .new_event_system .contact_container .preview_list_element').remove(); 

				// Store a temporary copy of the array of notes - it is used in case the user presses "cancel"
				event_object.array_of_user_ids_loaded_from_current_event = 
					event_object.array_of_user_ids_assigned_to_current_event.slice(0);

				// Draw the contacts onto the screen
				var total_event_users = event_object.event_users.length;
				if( total_event_users > 0){
					// Cycle through user objects
					for ( var i = 0 ; i < total_event_users ; i++ ){
						CalendarObject.EventDetails.paint_contact_list_element(event_object.event_users[i]);
					} // END - for()
				} // END - if 

			}
			else {

				var data = { 
					"action"			: "BIND_EVENT_TO_USERS", // reverse order ... confusing, innit? TODO - talk to Simon about this!
					"credentials" : CREDENTIALS_OBJECT, 																									// user authentication
					"event_id" 		: event_id, 																															// 
					"users" 			: event_object.array_of_user_ids_assigned_to_current_event 			// array
				};
				console.log(data);

				$.post(API_PHP_URL + 'api.php', data, function(responseText){
					try {

						// console.log(responseText);
						console.log("Got a response from the server!"); // original message is WAY too long!

						// Refresh the GUI
						// We need to force a server refresh for this section - 
						CalendarObject.EventDetails.force_server_refresh(event_id); 

					} catch(e) {
						alert("Unknown error "+ e +".");
						return;
					}
				});

			}

		}, // bind_events_to_contacts

		revert_to_original_binding : function(event_id) {

			// Get our DOM object
			var event_object = CalendarObject.EventDetails.find_event_object(event_id);

			// Check for new event 
			if(event_id == 0) {
				// Copy (by VALUE) the ids we were storing temporarily. 
				event_object.array_of_user_ids_assigned_to_current_event = 
					event_object.array_of_user_ids_loaded_from_current_event.slice(0);
				return; 
			}

			// We don't need to check to see if users exist for an event - 
				// because all events have at least one user : the creator 

			// Copy (by VALUE) the ids we got at load time, and assign them to the array currently assigned. 
			event_object.array_of_user_ids_assigned_to_current_event = 
				event_object.array_of_user_ids_loaded_from_current_event.slice(0); // slicing from 0 basically means copy everything

		}, 

		//

		loading_from_event_list : false, 
			// used for adding contacts to a new (unsaved) event 

		refresh_list_of_selected_contacts : function(event_id) { // HHHH

			// Don't want duplicates, now do we?
			CalendarObject.Contacts.clear_all_selected_contact_list_elements(); 

			// Get our DOM object
			var event_object 	= CalendarObject.EventDetails.find_event_object(event_id); 

			// Create an array of contact_ids and make sure that it's empty
			event_object.array_of_user_ids_assigned_to_current_event = [];
			event_object.array_of_user_ids_assigned_to_current_event.length = 0; 

			// Search for notes
			var total_event_users = event_object.event_users.length;
			if( total_event_users > 0){

				CalendarObject.Contacts.loading_from_event_list = true; 

				for ( var i = 0 ; i < total_event_users ; i++ ){

					var user_object 			= event_object.event_users[i];
					var contact_id 				= user_object['user_id'];

					if (user_object['last_name']){
						var contact_name 			= user_object['first_name'] + " " + user_object['last_name'];
					} else {
						var contact_name 			= user_object['first_name']; 
					}

					CalendarObject.Contacts.create_selected_contact_list_element(contact_id, contact_name);

				} // END - for()

				// Reset our variable
				CalendarObject.Contacts.loading_from_event_list = false; 

			} // END - if 

			// Bind all of the selected list elements

		},

		//

		create_selected_contact_list_element: function (contact_id, contact_name) { // JJJJ

			// Create a new element for the note inside the "selected_contact_list" div
			// This visually indicates the events that are selected for an event 

			var event_object 	= CalendarObject.EventDetails.find_event_object(CalendarObject.Globals.current_event_id);

			// Check if note has already been added to this event
			var is_contact_already_added = 
				jQuery.inArray( parseInt(contact_id), event_object.array_of_user_ids_assigned_to_current_event);

			if(is_contact_already_added != -1){
				console.log("This contact has already been added to this event");
			}
			else {

				// Add the note to array
				event_object.array_of_user_ids_assigned_to_current_event.push( parseInt(contact_id) );

				// Create the element in the DOM 
				var new_selected_contact_list_element = 		
														'<div class="preview_list_element selected" data-contact_id="' + contact_id + '" >' + 
															contact_name + 
														'</div>';

				$('.dialog_window.add_contact_to_event .selected_contact_list').append(new_selected_contact_list_element);

				// Re-bind everything, so that our list elements work properly
				CalendarObject.Contacts.bind_all_selected_contact_list_elements();

				// Check that this is a new event - AND - we are not loading from the event_list - otherwise we would create duplicate entries
				if( (CalendarObject.Globals.current_event_id == 0) && (CalendarObject.Contacts.loading_from_event_list == false) ) {
					// Create a pseudo contact object
					var contact_object = { 
						"user_id" 				: contact_id, 
						"first_name" 			: contact_name, 
						"last_name" 			: "" // this is a shameless hack
					}
					// Push it to our array
					event_object.event_users.push(contact_object); 
				} 

			}

		}, // END - 

		destroy_selected_contact_list_element: function(contact_id) {

			var event_object 	= CalendarObject.EventDetails.find_event_object(CalendarObject.Globals.current_event_id);

			// Remove the user-id from the array
			event_object.array_of_user_ids_assigned_to_current_event.remove_value_from_array( parseInt(contact_id) );

			// Remove the object from the DOM
			var list_selector = 	$('.dialog_window.add_contact_to_event .selected_contact_list ' + 
															'.preview_list_element[data-contact_id=' + contact_id + ']');
			$(list_selector).remove();

			// If this is a new event, we want to remove it from our event_note array
			if(CalendarObject.Globals.current_event_id == 0) {
				// Hunt down the user_id and remove it from our array
				for ( var i = 0 ; i < event_object.event_users.length ; i++ ){
					// If found, remove it from our array
					if( parseInt(event_object.event_users[i]['user_id']) == contact_id ){
						event_object.event_users.splice(i, 1); 
						console.log("found object"); 
						break;
					}
				} // END - for()
			} // END - if()

		},

		clear_all_selected_contact_list_elements : function() {
			// Remove the contact_list_elements right before a refresh
			$('.dialog_window.add_contact_to_event .selected_contact_list .preview_list_element').remove();

		}, 

		//

		bind_all_contact_list_elements: function() {
			// Clicking on a note from the contact_list in the left panel will create a duplicate of that note
			// in the "selected_contact_list" div; 
			// This indicates to the user which users have been selected to engage in time match
			$('.dialog_window.add_contact_to_event .contact_list .preview_list_element').unbind();
			$('.dialog_window.add_contact_to_event .contact_list .preview_list_element').bind('tap click', function(event){
				var contact_id 			= $(event.currentTarget).attr('data-contact_id');
				var contact_name 		= $(event.currentTarget).html(); // TODO - might need to fix this
				CalendarObject.Contacts.create_selected_contact_list_element(contact_id, contact_name);
			});
		},

		bind_all_selected_contact_list_elements: function() {
			// Clicking on a note that has already been selected will remove that note from the "selected_contact_list" div
			$('.dialog_window.add_contact_to_event .selected_contact_list .preview_list_element').unbind();
			$('.dialog_window.add_contact_to_event .selected_contact_list .preview_list_element').bind('tap click', function(event){
				//console.log("clicked to destroy");
				var contact_id = $(event.currentTarget).attr('data-contact_id');
				CalendarObject.Contacts.destroy_selected_contact_list_element(contact_id);
			});
		}, 

		//

		initialize : function() {
			CalendarObject.Contacts.bind_dialog_window(); 
			// CalendarObject.Contacts.bind_all_contact_list_elements(); 
		}

	}; // END - CalendarObject.Contacts



	CalendarObject.Tasks = {

		bind_dialog_window : function() {

			$( ".dialog_window.add_task_to_event" ).dialog({
				resizable: false,
				height:300,
				width:500,
				modal: true,
				autoOpen: false,
				buttons: {
					Cancel: function() {
						var event_id = CalendarObject.Globals.current_event_id; // set this now!
						CalendarObject.Tasks.revert_to_original_binding(event_id); 
						$( this ).dialog( "close" );
					},
					"Accept": function() { 
						var event_id = CalendarObject.Globals.current_event_id; // set this now!
						CalendarObject.Tasks.bind_event_to_tasks(event_id); 
						$( this ).dialog( "close" );
					}
				} // END - buttons {}
			});

		},

		open_dialog_window : function() {
			// Refresh the list of notes that are attached to this event
			CalendarObject.Tasks.refresh_list_of_selected_tasks(CalendarObject.Globals.current_event_id); 
			// Open the window
			$( ".dialog_window.add_task_to_event" ).dialog( "open" ); 
		}, 

		// 

		bind_event_to_tasks : function(event_id) {

			var event_object 	= CalendarObject.EventDetails.find_event_object(event_id);

			// Check for a NEW event
			if(event_id == 0){

				// Clean up any existing elements to avoid duplicates
				$('.panel.calendar .new_event_system .task_container .preview_list_element').remove(); 

				// Store a temporary copy of the array of notes - it is used in case the user presses "cancel"
				event_object.array_of_task_ids_loaded_from_current_event = 
					event_object.array_of_task_ids_assigned_to_current_event.slice(0);

				// Draw the notes onto the screen
				var total_event_tasks = event_object.event_tasks.length;
				if( total_event_tasks > 0){
					// Cycle through note objects
					for ( var i = 0 ; i < total_event_tasks ; i++ ){
						var task_object 				= event_object.event_tasks[i];
						var task_id 						= task_object['task_id'];
						var task_description 		= task_object['description'];
						CalendarObject.EventDetails.paint_task_list_element(task_id, task_description);
					} // END - for()
				} // END - if 

			}
			else {

				var data = { 
					"action"			: "BIND_EVENT_TO_TASKS",
					"credentials" : CREDENTIALS_OBJECT, 																						// user authentication
					"event_id" 		: event_id, 																											// event
					"tasks" 			: event_object.array_of_task_ids_assigned_to_current_event 				// array
				};
				console.log(data);

				$.post(API_PHP_URL + 'api.php', data, function(responseText){
					try {
						// console.log(responseText);
						console.log("Got a response from the server!"); // original message is WAY too long!

						// Refresh the GUI - // We need to force a server refresh for this section - 
						CalendarObject.EventDetails.force_server_refresh(event_id); 

					} catch(e) {
						alert("Unknown error "+ e +".");
						return;
					}
				});

			}

		}, // END - bind_event_to_tasks()

		revert_to_original_binding : function(event_id) {

			// Get our DOM object
			var event_object = CalendarObject.EventDetails.find_event_object(event_id);

			// Check for new event 
			if(event_id == 0) {
				// Copy (by VALUE) the ids we were storing temporarily. 
				event_object.array_of_task_ids_assigned_to_current_event = 
					event_object.array_of_task_ids_loaded_from_current_event.slice(0);
				return; 
			}

			// Check to see that it exists
			if(event_object.array_of_task_ids_loaded_from_current_event){
				// Copy (by VALUE) the ids we got at load time, and assign them to the array currently assigned. 
				event_object.array_of_task_ids_assigned_to_current_event = 
					event_object.array_of_task_ids_loaded_from_current_event.slice(0); // slicing from 0 basically means copy everything
			}
			else {
				// We are adding elements to a newly created event, and it was never truly "loaded"
				console.log("array_of_task_ids_loaded_from_current_event - is undefined");
				event_object.array_of_task_ids_assigned_to_current_event.length = 0; 
			}

		},

		//

		loading_from_event_list : false, 
			// used for adding notes to a new (unsaved) event 

		refresh_list_of_selected_tasks : function(event_id) { // HHHH

			// Don't want duplicates, now do we?
			CalendarObject.Tasks.clear_all_selected_task_list_elements(); 

			// Get our DOM object
			var event_object = CalendarObject.EventDetails.find_event_object(event_id);

			// Create an array of note_ids - ensure that it is empty
			event_object.array_of_task_ids_assigned_to_current_event = [];
			event_object.array_of_task_ids_assigned_to_current_event.length = 0; 

			// Search for tasks
			var total_event_tasks = event_object.event_tasks.length;
			if( total_event_tasks > 0){

				CalendarObject.Tasks.loading_from_event_list = true; 

				for ( var i = 0 ; i < total_event_tasks ; i++ ){

					var task_object 			= event_object.event_tasks[i];
					var task_id 					= task_object['task_id'];
					var task_description 	= task_object['description'];

					CalendarObject.Tasks.create_selected_task_list_element(task_id, task_description);

				} // END - for()

				// Reset our variable
				CalendarObject.Tasks.loading_from_event_list = false; 

			} // END - if()

			// Bind all of the selected list elements

		},

		//

		create_selected_task_list_element: function (task_id, task_description) {

			// Create a new element for the task inside the "selected_note_list" div
			// This visually indicates the tasks that are selected for an event 

			var event_object = CalendarObject.EventDetails.find_event_object(CalendarObject.Globals.current_event_id);

			// Check if task has already been added to this event
			var is_task_alread_added = 
				jQuery.inArray( parseInt(task_id), event_object.array_of_task_ids_assigned_to_current_event);

			if(is_task_alread_added != -1){
				console.log("This task has already been added to this event");
			}
			else {

				// Add the task to array
				event_object.array_of_task_ids_assigned_to_current_event.push( parseInt(task_id) );

				// Create the element in the DOM 
				var new_selected_task_list_element = 		
														'<div class="preview_list_element selected" data-id="' + task_id + '" >' + 
															task_description + 
														'</div>';

				$('.dialog_window.add_task_to_event .selected_task_list').append(new_selected_task_list_element);

				// Re-bind everything, so that our list elements work properly
				CalendarObject.Tasks.bind_all_selected_task_list_elements();

				// Check that this is a new event - AND - we are not loading from the event_list - otherwise we would create duplicate entries
				if( (CalendarObject.Globals.current_event_id == 0) && (CalendarObject.Tasks.loading_from_event_list == false) ) {
					// Create a pseudo note object
					var task_object = { 
						"task_id" 			: task_id, 
						"description" 	: task_description
					}
					// Push it to our array
					event_object.event_tasks.push(task_object); 
				} 

			}

		}, // END - 

		destroy_selected_task_list_element : function(task_id) {

			var event_object = CalendarObject.EventDetails.find_event_object(CalendarObject.Globals.current_event_id);

			// Remove the user-id from the array
			event_object.array_of_task_ids_assigned_to_current_event.remove_value_from_array( parseInt(task_id) );

			// Remove the object from the DOM
			var list_selector = 	$('.dialog_window.add_task_to_event .selected_task_list ' + 
															'.preview_list_element[data-id=' + task_id + ']');
			$(list_selector).remove();

			// If this is a new event, we want to remove it from our event_note array
			if(CalendarObject.Globals.current_event_id == 0) {
				// Hunt down the task_id and remove it from our array
				for ( var i = 0 ; i < event_object.event_tasks.length ; i++ ){
					// If found, remove it from our array
					if( parseInt(event_object.event_tasks[i]['task_id']) == task_id ){
						event_object.event_tasks.splice(i, 1); 
						console.log("found object"); 
						break;
					}
				} // END - for()
			} // END - if()

		},

		clear_all_selected_task_list_elements : function() {
			// Remove the task_list_elements right before a refresh
			$('.dialog_window.add_task_to_event .selected_task_list .preview_list_element').remove();
		}, 

		//

		bind_all_task_list_elements: function() {
			// Clicking on a task from the task_list in the left panel will create a duplicate of that task
			// in the "selected_task_list" div; 
			// This indicates to the user which users have been selected to engage in time match
			$('.dialog_window.add_task_to_event .task_list .preview_list_element').unbind();
			$('.dialog_window.add_task_to_event .task_list .preview_list_element').bind('tap click', function(event){
				var task_id = $(event.currentTarget).attr('data-id');
				var task_description = $(event.currentTarget).html();
				CalendarObject.Tasks.create_selected_task_list_element(task_id, task_description);
			});
		},

		bind_all_selected_task_list_elements: function() {
			// Clicking on a task that has already been selected will remove that task from the "selected_task_list" div
			$('.dialog_window.add_task_to_event .selected_task_list .preview_list_element').unbind();
			$('.dialog_window.add_task_to_event .selected_task_list .preview_list_element').bind('tap click', function(event){
				//console.log("clicked to destroy");
				var task_id = $(event.currentTarget).attr('data-id');
				CalendarObject.Tasks.destroy_selected_task_list_element(task_id);
			});
		}, 

		//

		initialize : function() {
			CalendarObject.Tasks.bind_dialog_window(); 
			//CalendarObject.Tasks.bind_all_task_list_elements(); // Bound in tasks.js - refresh_task_list() // 
		}

	}; // END - CalendarObject.Tasks


// TODO : 
// Change all the tasks stuff to NOTES stuff
	CalendarObject.Notes = {


		bind_dialog_window : function() {

			$( ".dialog_window.add_note_to_event" ).dialog({
				resizable: false,
				height:300,
				width:500,
				modal: true,
				autoOpen: false,
				buttons: {

					Cancel: function() {
						var event_id = CalendarObject.Globals.current_event_id; // set this now!
						CalendarObject.Notes.revert_to_original_binding(event_id); 
						$( this ).dialog( "close" );
					},

					"Accept": function() { 
						var event_id = CalendarObject.Globals.current_event_id; // set this now!
						CalendarObject.Notes.bind_event_to_notes(event_id); 
						$( this ).dialog( "close" );
					}

				} // END - buttons {}
			}); // END - dialog(); 

		},

		open_dialog_window : function() {
			// Refresh the list of notes that are attached to this event
			CalendarObject.Notes.refresh_list_of_selected_notes(CalendarObject.Globals.current_event_id); // HHHH
			// Open the window
			$( ".dialog_window.add_note_to_event" ).dialog( "open" ); 
		}, 

		// 

		bind_event_to_notes : function(event_id) {

			var event_object 	= CalendarObject.EventDetails.find_event_object(event_id);

			// Check for a NEW event
			if(event_id == 0){

				// Clean up any existing elements to avoid duplicates
				$('.panel.calendar .new_event_system .note_container .preview_list_element').remove(); 

				// Store a temporary copy of the array of notes - it is used in case the user presses "cancel"
				event_object.array_of_note_ids_loaded_from_current_event = 
					event_object.array_of_note_ids_assigned_to_current_event.slice(0);

				// Draw the notes onto the screen
				var total_event_notes = event_object.event_notes.length;
				if( total_event_notes > 0){
					// Cycle through note objects
					for ( var i = 0 ; i < total_event_notes ; i++ ){
						var note_object 			= event_object.event_notes[i];
						var note_id 					= note_object['note_id'];
						var note_body 				= note_object['body'];
						CalendarObject.EventDetails.paint_note_list_element(note_id, note_body);
					} // END - for()
				} // END - if 

			}
			else {

				// If this is an EXISTING event, go on about our business
				var data = { 
					"action"			: "BIND_EVENT_TO_NOTES",
					"credentials" : CREDENTIALS_OBJECT, 																						// user authentication
					"event_id" 		: event_id, 																											// event
					"notes" 			: event_object.array_of_note_ids_assigned_to_current_event 				// array
				};
				console.log(data);

				$.post(API_PHP_URL + 'api.php', data, function(responseText){
					try {
						// console.log(responseText);
						console.log("Got a response from the server!"); // original message is WAY too long!
						// Refresh the GUI
						CalendarObject.EventDetails.force_server_refresh(event_id); 
					} 
					catch(e) {
						alert("Unknown error "+ e +".");
						return;
					}
				});

			}

		}, // END - bind_event_to_notes()

		revert_to_original_binding : function(event_id) {

			// Get our DOM object
			var event_object = CalendarObject.EventDetails.find_event_object(event_id);

			// Check for new event 
			if(event_id == 0) {
				// Copy (by VALUE) the ids we were storing temporarily. 
				event_object.array_of_note_ids_assigned_to_current_event = 
					event_object.array_of_note_ids_loaded_from_current_event.slice(0);
				return; 
			}

			// Check to see that it exists
			if(event_object.array_of_note_ids_loaded_from_current_event){
				// Copy (by VALUE) the ids we got at load time, and assign them to the array currently assigned. 
				event_object.array_of_note_ids_assigned_to_current_event = 
					event_object.array_of_note_ids_loaded_from_current_event.slice(0); // slicing from 0 basically means copy everything
			}
			else {
				// We are adding elements to a newly created event, and it was never truly "loaded"
				console.log("array_of_note_ids_loaded_from_current_event - is undefined");
				event_object.array_of_note_ids_assigned_to_current_event.length = 0; 
			}

		}, 

		//

		loading_from_event_list : false, 
			// used for adding notes to a new (unsaved) event 

		refresh_list_of_selected_notes : function(event_id) { // HHHH

			// Don't want duplicates, now do we?
			CalendarObject.Notes.clear_all_selected_note_list_elements(); 

			// Get our DOM object
			var event_object = CalendarObject.EventDetails.find_event_object(event_id);

			// Create an array of note_ids - ensure that it is empty
			event_object.array_of_note_ids_assigned_to_current_event = [];
			event_object.array_of_note_ids_assigned_to_current_event.length = 0; 

			// Search for notes
			var total_event_notes = event_object.event_notes.length;
			if( total_event_notes > 0){

				CalendarObject.Notes.loading_from_event_list = true; 

				for ( var i = 0 ; i < total_event_notes ; i++ ){

					var note_object 			= event_object.event_notes[i];
					var note_id 					= note_object['note_id'];
					var note_body 				= note_object['body'];

					CalendarObject.Notes.create_selected_note_list_element(note_id, note_body);
				} 

				// Reset our variable
				CalendarObject.Notes.loading_from_event_list = false; 

			} // END - if()

			// Bind all of the selected list elements

		},

		//

		create_selected_note_list_element: function (note_id, note_body) { // JJJJ

			// Create a new element for the note inside the "selected_note_list" div
			// This visually indicates the tasks that are selected for an event 

			var event_object = CalendarObject.EventDetails.find_event_object(CalendarObject.Globals.current_event_id);

			// Check if note has already been added to this event
			var is_note_already_added = 
				jQuery.inArray( parseInt(note_id), event_object.array_of_note_ids_assigned_to_current_event);

			if(is_note_already_added != -1){
				console.log("This note has already been added to this event");
			}
			else {

				// Add the note to array
				event_object.array_of_note_ids_assigned_to_current_event.push( parseInt(note_id) );

				// Create the element in the DOM 
				var new_selected_note_list_element = 		
														'<div class="preview_list_element selected" data-id="' + note_id + '" >' + 
															note_body + 
														'</div>';

				$('.dialog_window.add_note_to_event .selected_note_list').append(new_selected_note_list_element);

				// Re-bind everything, so that our list elements work properly
				CalendarObject.Notes.bind_all_selected_note_list_elements();

				// Check that this is a new event - AND - we are not loading from the event_list - otherwise we would create duplicate entries
				if( (CalendarObject.Globals.current_event_id == 0) && (CalendarObject.Notes.loading_from_event_list == false) ) {
					// Create a pseudo note object
					var note_object = { 
						"note_id" 		: note_id, 
						"body" 				: note_body
					}
					// Push it to our array
					event_object.event_notes.push(note_object); 
				} 

			} // END - else

		}, // END - create_selected_note_list_element

		destroy_selected_note_list_element: function(note_id) {

			var event_object = CalendarObject.EventDetails.find_event_object(CalendarObject.Globals.current_event_id);

			// Remove the user-id from the array
			event_object.array_of_note_ids_assigned_to_current_event.remove_value_from_array( parseInt(note_id) );

			// Remove the object from the DOM
			var list_selector = 	$('.dialog_window.add_note_to_event .selected_note_list ' + 
															'.preview_list_element[data-id=' + note_id + ']');
			$(list_selector).remove();

			// If this is a new event, we want to remove it from our event_note array
			if(CalendarObject.Globals.current_event_id == 0) {

				// Hunt down the note_id and remove it from our array
				for ( var i = 0 ; i < event_object.event_notes.length ; i++ ){

					// If found, remove it from our array
					if( parseInt(event_object.event_notes[i]['note_id']) == note_id ){
						event_object.event_notes.splice(i, 1); 
						console.log("found object"); 
						break;
					}

				} // END - for()
			} // END - if()

		}, // END - destroy_selected_note_list_element()

		clear_all_selected_note_list_elements : function() {
			// Remove the note_list_elements right before a refresh
			$('.dialog_window.add_note_to_event .selected_note_list .preview_list_element').remove();

		}, 

		//

		bind_all_note_list_elements: function() {
			// Clicking on a note from the note_list in the left panel will create a duplicate of that note
			// in the "selected_note_list" div; 
			// This indicates to the user which users have been selected to engage in time match
			$('.dialog_window.add_note_to_event .note_list .preview_list_element').unbind();
			$('.dialog_window.add_note_to_event .note_list .preview_list_element').bind('tap click', function(event){
				var note_id = $(event.currentTarget).attr('data-id');
				var note_body = $(event.currentTarget).html();
				CalendarObject.Notes.create_selected_note_list_element(note_id, note_body);
			});
		},

		bind_all_selected_note_list_elements: function() {
			// Clicking on a note that has already been selected will remove that note from the "selected_note_list" div
			$('.dialog_window.add_note_to_event .selected_note_list .preview_list_element').unbind();
			$('.dialog_window.add_note_to_event .selected_note_list .preview_list_element').bind('tap click', function(event){
				//console.log("clicked to destroy");
				var note_id = $(event.currentTarget).attr('data-id');
				CalendarObject.Notes.destroy_selected_note_list_element(note_id);
			});
		}, 

		//

		initialize : function() {
			CalendarObject.Notes.bind_dialog_window(); 
			// CalendarObject.Notes.bind_all_note_list_elements(); 
		}

	}; // END - CalendarObject.Notes



	// ---------------------------------------------------------------------------------------------------------------
	CalendarObject.Push = {
	// ---------------------------------------------------------------------------------------------------------------

		// This object deals with push-specific functions of the application. 

		event_was_updated : function(event_id) { 

			// TODO - 
			// Should give the user some sort of warning about events that were recently changed or updated
			// This will have to tie in with the alerts engine later on 
			// e.g. "Changes were made to the following events - "

			// 

			// Check to see if the user is currently editing the event that was pushed. 
			if (event_id != CalendarObject.Globals.current_event_id ){

				// The event was not being edited, so just remove it from local storage 
				// If the event didn't exist, the function just returns false. 
				CalendarObject.EventDetails.remove_event_from_local_storage(event_id); 

			}
			else {

				// NOW we have a problem 
				// TODO - figure out what has to happen if the user is currently browsing an event that has just been updated by another user!

				alert("The event you are currently viewing - " + event_id + " - has been updated. It will automatically refresh now."); 

				// TODO : 
				// We will have to compare what the user has currently written with what WAS written, etc. etc. 
				// This needs work, but for now, fuck it. 

			}

		}, 

		events_were_updated : function(array_of_events) {

			// Loop through each event in the array
			for ( var i = 0 , length = array_of_events.length ; i < length ; i++ ){
				CalendarObject.Push.event_was_updated(array_of_events[i]); 
			}

		}, 

		//

		initialize : function() {


		}

	}; // END  - CalendarObject.Push



	// ---------------------------------------------------------------------------------------------------------------
	CalendarObject.QuickActions = {
	// ---------------------------------------------------------------------------------------------------------------

		create_new_event : function() {
			// Creates a regular event
			CalendarObject.Navigation.switch_to_system("new_event");
			CalendarObject.NewEvent.new_event(); 
		}, 

		create_new_time_matched_event : function() {
			// Starts up the time match system 
			CalendarObject.Navigation.switch_to_system("time_match");
			CalendarObject.NewEvent.prepare_for_new_event_from_time_match(); // BNX
			// Clean up any existing results (if they exist); 
			$('.panel.calendar .time_match_system .available_times .preview_list_element').remove(); 
		}, 

		jump_to_today : function() {

			// Clear all detail fields
			CalendarObject.EventDetails.clear_new_event_details();

			// Reset the current_event ID
			CalendarObject.Globals.current_event_id = 0; 
				// WARNING - "0" is interpreted as "new" if the user hits "save event" so be careful with this

			// Hide the right panel
			$('.panel.calendar .display_system .right_panel').hide(); 

			// Show the helper pane
			$('.panel.calendar .display_system .far_right_panel').show(); 

			// Get a fresh date - BLX
			var today = new Date(); 

			// Apply the date's properties to our globals
			CalendarObject.Globals.current_day 			= today.getDate(); 
			CalendarObject.Globals.current_month 		= today.getMonth() + 1;
			CalendarObject.Globals.current_year 		= today.getFullYear();

			// Reset the proper views
			CalendarObject.DayView.refresh_day_view(); 
			CalendarObject.MonthView.refresh_month_view(); 

		}

	}; // END - CalendarObject.QuickActions; 



	// ---------------------------------------------------------------------------------------------------------------
	// INITIALIZATION
	// ---------------------------------------------------------------------------------------------------------------

	// CREATE A NEW EVENT 
	$('.panel.calendar .display_system .header .new_event_button, .panel.calendar .display_system .far_right_panel .info_button.new_event').unbind();
	$('.panel.calendar .display_system .header .new_event_button, .panel.calendar .display_system .far_right_panel .info_button.new_event').bind('tap click', function(event){
		CalendarObject.QuickActions.create_new_event(); 
	}); 

	// TIME MATCH
	$('.panel.calendar .display_system .header .time_match_button, .panel.calendar .display_system .far_right_panel .info_button.time_match').unbind();
	$('.panel.calendar .display_system .header .time_match_button, .panel.calendar .display_system .far_right_panel .info_button.time_match').bind('tap click', function(event){
		CalendarObject.QuickActions.create_new_time_matched_event(); 
	});

	// TODAY
	$('.panel.calendar .display_system .header .today_button').unbind();
	$('.panel.calendar .display_system .header .today_button').bind('tap click', function(event){
		CalendarObject.QuickActions.jump_to_today(); 
	});

	// CANCEL
	$('.panel.calendar .display_system .header .cancel_button').unbind();
	$('.panel.calendar .display_system .header .cancel_button').bind('tap click', function(event){
		CalendarObject.Navigation.switch_to_system("display");
		CalendarObject.EventDetails.delete_event(CalendarObject.Globals.current_event_id);
	});

	// TODO - investigate the element below - should we incorporate it into the header again?

	// SAVE DETAILS - NEW EVENT
	$('.panel.calendar .display_system .header .create_button').unbind();
	$('.panel.calendar .display_system .header .create_button').bind('tap click', function(event){
		CalendarObject.NewEvent.create_event();
		console.log("Called - create_event()");
		CalendarObject.Navigation.switch_to_system("display");
	});

	// SAVE DETAILS - EXISTING EVENT
	$('.panel.calendar .display_system .header .save').unbind();
	$('.panel.calendar .display_system .header .save').bind('tap click', function(event){
		CalendarObject.EventDetails.save_event(CalendarObject.Globals.current_event_id);
	});




	// ------------------------------------------------------------------

	CalendarObject.DayView.initialize();
	CalendarObject.MonthView.initialize();
	//
	CalendarObject.TimeMatch.initialize();
	CalendarObject.EventDetails.initialize();
	//
	CalendarObject.MonthEventList.initialize();

	CalendarObject.PendingEventList.initialize(); 
	//
	CalendarObject.NewEvent.initialize();
	//
	CalendarObject.Contacts.initialize(); 
	CalendarObject.Tasks.initialize(); 
	CalendarObject.Notes.initialize(); 
	// 
	CalendarObject.EventListController.initialize(); 



}); // END - jQuery Wrapper


