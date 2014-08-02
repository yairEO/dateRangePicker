/*!
	ranegPicker v1.0
	(c) 2013 Yair Even Or

	MIT-style license.
*/

;(function($){
	"use strict";

	var $doc = $(document),
		RangePicker,
		lastValue,
		// DOM structure
        Template = $('<div class="rangePicker"> \
        				<div class="wrap"> \
							<div class="preset"></div> \
							<div class="custom"> \
								<div class="calendar from"><strong></strong></div> \
								<div class="calendar to"></div> \
								<footer> \
									<button type="button" class="confirm btn btn-primary">Apply</button> \
									<button type="button" class="cancel btn">Cancel</button> \
								</footer> \
							</div> \
						</div> \
					</div>');

		RangePicker = function(obj, settings, callback){
			this.settings = settings;
			this.picker   = Template.clone();
			this.obj 	  = $(obj);
			this.callback = typeof callback == 'function' ? callback : null;
			this.result; // the chosen date

			// set direction mode
			if( this.settings.RTL )
				this.picker.addClass('RTL');
			// inject picker
			this.picker.insertAfter(this.obj);

			// for positioning
			this.tether = new Tether({
				element         : this.picker,
				target          : this.obj,
				attachment      : this.settings.RTL ? 'top right' : 'top left',
				targetAttachment: this.settings.RTL ? 'bottom right' : 'bottom left',
				constraints: [{
			     	to: 'window',
			     	attachment: 'together'
			    }]
			})
		};

		RangePicker.prototype = {
			// prepare the DOM for a new picker
			init : function(){
                var i, len;

				// prevent bubbling of clicking inside the picker to the outside
				this.picker.add(this.obj).on('mousedown', function(e){ e.stopPropagation() });

				var that 		  = this,
					presetWrap    = this.picker.find('.preset'),
					presetDefault = null,
					years 		  = '',
					months 		  = '',
					startYear 	  = this.settings.minDate[1],
					endYear 	  = this.settings.maxDate[1],
					totalYears    = endYear - startYear,
					month, button, i;

				// add the "custom" preset to the array of presets
			//	this.settings.presets.push({ buttonText:'custom', value:'custom' });

				// presets
				for( i = this.settings.presets.length; i--; ){
					presetWrap.prepend( "<button type='button' value='"+ this.settings.presets[i].value +"'>" + this.settings.presets[i].buttonText + "</button>" );
				}
				this.presets = presetWrap.find('button');

				// add indexes to match them for the right place in the this.result array
				this.calendar = {
					from : this.picker.find('.calendar.from'),
					to   : this.picker.find('.calendar.to')
				}

				// years
				for( i = totalYears + 1; i--; ){
					years += '<option value="'+ (endYear - i) +'">'+ (endYear - i) +'</option>';
				}

				// months
				for( i = 0, len = this.settings.months.length; i < len; i++ ){
                    month = '<button>'+ this.settings.months[i] + '</button>';
                    months += month;
				}

				// generate "custom" markup for years and months
				this.calendar.from.append(
					$('<select>').html(years),  // years.replace(/%%/g,'From - ')
					$('<div>').addClass('months').html(months)
				);

				this.calendar.to.append( this.calendar.from.html() );


				this.yearSelectors = this.picker.find('select');
				// pre-select the last year for the END picker
				// link each <select> to the other one for validation purposes
				this.yearSelectors[0].selectedIndex = this.yearSelectors[1].selectedIndex = totalYears;

				this.bind();
				// preselect years:
				this.yearSelectors.trigger('change');

				if( this.settings.setDate )
					this.update( this.settings.setDate );
			},

			bind : function(){
				var that = this;
				// when clicking the input object bound to this picker, show the picker
				this.obj.on('click', function(){ that.show.apply(that) });

				this.picker
					.on('click', '.preset > button', 	that.presetClick.bind(that))
					.on('click.dp', '.months > button', that.monthClick.bind(that))
					.on('change', 'select', 			that.changeYear.bind(that))
					.on('click', '.confirm',  			that.applyDate.bind(that))
					.on('click', '.cancel', 			that.cancel.bind(that))
			},

			destroy : function(){
				this.picker.remove();
				this.obj.removeData('_ranegPicker');
			},

			show : function(){
				var that = this;

				// hide all other pickers, if present on the page
				$('.rangePicker.show').removeClass('show');

				if( this.picker.hasClass('show') ){
					this.hide();
					return;
				}

				this.picker.addClass('show');
				// close picker when clicking outside
				setTimeout(function(){
					$doc.on('mousedown._rp', function(){ that.cancel.apply(that); });
				},100);

				this.obj.trigger('datePicker.show');
			},

			hide : function(){
				this.picker.removeClass('show');
				$doc.off('mousedown._rp');
			},

			cancel : function(){
				// reverse changes
				this.update( lastValue );
				this.hide();
			},

			monthClick : function(e){
				var calendarIdx =  $(e.target).parents('.calendar').index(),
					monthIdx = $(e.target).index();

				this.changeMonth( calendarIdx, monthIdx );
			},

			// when clicking the "apply" button
			applyDate : function(){
				this.update();

				if( this.settings.closeOnSelect )
					this.hide();

				this.obj.trigger('datePicker.done', [this.result]);
			},

			presetClick : function(e){
				this.changePreset(e.target.value);
			},

			// change selected preset and remove the selection from the custom area
			changePreset : function(val){
				var presetWrap = this.presets.parent();
				this.summary();

				if( val ){
					this.presets.removeClass('selected').filter('[value='+ val +']').addClass('selected');
					// set the result
					presetWrap.addClass('set');
					// remove the custom range selections

					if( val == 'custom' ){
						this.picker.addClass('custom');
						this.applyBtnState();
					}
					else{
						this.result = val;
						this.picker.find('.months').find('.selected').removeClass('selected');
						this.picker.removeClass('custom');
						this.applyDate();
					}
				}
			},

			// make sure the all options for the END year will be valid, relative to the chosen START year
			valideEndYear : function(){
				var index = this.yearSelectors[0].selectedIndex;

				// hide irrelevant options in the END year selector
				this.yearSelectors.eq(1).find('option').hide().slice(index).show();

				if( this.yearSelectors[1].selectedIndex < index ){
					this.yearSelectors[1].selectedIndex = index;
					this.result[1][1] = this.result[0][1]
				}
			},

			// disable irrelevant months
			validMonthsInYear : function(reset){
				var that = this, monthsElements;

				// both month pickers must be validated because they are "linked" to each-other.
				this.yearSelectors.each(function(){
					monthsElements = $(this).next('.months').find('button');
					// reset all months
					if( reset )
						monthsElements.prop('disabled', false);
					// for FIRST year
					if( this.selectedIndex == 0 )
						monthsElements.slice(0, that.settings.minDate[0] - 1 ).prop('disabled', true);

					// for LAST year
					if( this.selectedIndex == (this.length - 1) )
						monthsElements.slice( that.settings.maxDate[0] ).prop('disabled', true);

				});
			},

			changeYear : function(e){
				var that = this,
					calendarIdx = this.yearSelectors.index(e.target); // FROM or TO range

				this.changePreset();

				this.validMonthsInYear(true);

				if( calendarIdx == 0 )
					this.valideEndYear();

				if( typeof this.result != 'object' )
					this.result = [[],[]];

				// on year change, reset last selected month
				$(e.target).next('.months').find('.selected').removeAttr('class');
				this.result[calendarIdx][0] = undefined;

				// set the result
				this.result[calendarIdx][1] = e.target.value|0;

				// disable the dates of the "TO" calendar which are in the relative past
				if( calendarIdx == 1 )
					this.picker.find('.calendar.from').find('.selected').trigger('click.dp');

				this.summary();
				this.applyBtnState();
			},

			// validate months in one picker, relative to the other, to prevent "illegal" time-frame selections
			changeMonth : function(calendarIdx, monthIdx){
				var that = this,
					monthBtn = this.picker.find('.calendar').eq(calendarIdx).find('button').eq(monthIdx);

				monthBtn.addClass('selected').siblings().removeClass('selected');

				// it can also be a "string" when a preset was previously selected,so the result object needs to be reset
				if( typeof this.result != 'object' ){
					this.result = [[undefined, this.yearSelectors[0].value|0],[undefined, this.yearSelectors[1].value|0]];
				}

				this.result[calendarIdx][0] = monthIdx + 1;

				this.changePreset();

				// if both month pickers are currently at the same year, disable the END month which are in the "relative" past
				// & only the START month picker should affect the END picker and disable its "past" buttons
				if( this.result[0][1] == this.result[1][1] && calendarIdx == 0 ){
					this.picker.find('.calendar.to').find('button').prop('disabled', false).slice(0, monthIdx ).prop('disabled', true).removeClass('selected');

					// update the result if the "TO" value is now invalid because it's in the relative PAST to the "FROM" value
					if( this.result[0][0] > this.result[1][0] )
						this.result[1][0] = '';

					// if is also the last available year
					if( this.result[0][1] == this.settings.maxDate[1] )
						this.validMonthsInYear(false);
				}

				// set the year (should happen here as well)
				this.result[0][1] = this.yearSelectors[0].value;
				this.result[1][1] = this.yearSelectors[1].value;

				this.applyBtnState( !this.validateResult() );
			},

			// update the state (disabled/enabled) of the control buttons (apply)
			applyBtnState : function(state){
				if( state !== false )
					state = (typeof this.result == 'string') || !this.validateResult();

				this.picker.find('.confirm').prop('disabled', state);
			},

			// validate the result object
			// disable the "apply" button if validation fails
			validateResult : function(result){
				result = result || this.result;

				if( typeof this.result == 'object' ){
					if( result[0].length < 2 || result[1].length < 2
						|| !result[0][0] || !result[1][0]  // if there is no value
						|| result[0][1] < this.settings.minDate[1] || result[0][1] > this.settings.maxDate[1] // if START year is in the range
						|| result[1][1] < this.settings.minDate[1] || result[1][1] > this.settings.maxDate[1] // if END year is in the range
						|| result[0][1] > result[1][1]  // if START year is bigger than END year
						|| result[0][0] < 0 || result[0][0] > 12  || result[1][0] < 0  || result[1][0] > 12
						|| (result[0][1] == result[1][1] && result[0][0] > result[1][0])  // if START year == END year, then START month should be before the END month in the timeframe
					)
						return false;
				}

				return true;
			},

			changeCalendar : function(result){
                if( !this.validateResult(result) )
                    return false;

				var that = this;

				// Years
				this.yearSelectors[0].value = +result[0][1];
				this.yearSelectors[1].value = +result[1][1];
				this.valideEndYear();


				// Months
				this.validMonthsInYear(true);
				this.picker.find('.months').each(function(i){
					that.changeMonth( i, result[i][0] - 1 );
				});

				this.summary();
				return this;
			},

			summary : function(calendarIdx){
				if( !this.result )
					return this;

				var from = '',
				    to   = '';

				if( typeof this.result != 'string' ){
					if( this.result[0][0] && this.result[0][1] )
						from = '<span>'+ this.displayValue('%S') +'</span>';
					if( this.result[1][0] && this.result[1][1] )
						to = '<span>'+ this.displayValue('%E') +'</span>';
				}

				this.calendar.from.find('strong').html(from);
				this.calendar.to.find('strong').html(to);
			},

			// human-readable format for custom date
			displayValue : function(format){
				format = format || '%S - %E';

				format = format.replace('%S', this.settings.months[this.result[0][0] - 1] + ' ' + this.result[0][1]);
				format = format.replace('%E', this.settings.months[this.result[1][0] - 1] + ' ' + this.result[1][1]);

				return format;
			},

			update : function(result){
				var displayValue = '';

				if( result ){
					this.result = result;
					// if it's a preset
					if( typeof result == 'string' ){
						this.changePreset(result);
						return this;
					}

					if( !this.changeCalendar(result) )
						return this;

					this.changePreset('custom');
				}

				result = result || this.result || this.settings.presets[0].value;

				// update the object which had triggered rangePicker
				if( typeof result == 'string' ){
					for( var i = this.settings.presets.length; i--; ){
						if( this.settings.presets[i].value == result ){
							displayValue = this.settings.presets[i].displayText;
							break;
						}
					}
				}
				else{ // parse it
					displayValue =  this.displayValue();

					// normalize result type to "Number"
					result[0][1] = +result[0][1];
					result[1][1] = +result[1][1];
				}


				if( displayValue != undefined )
					this.obj[0].value = displayValue;

				lastValue = (typeof result == 'string') ? result : $.extend(true, {},result );

				this.result = result;

				return this;
			}
		};


	////////////////////////////////////
	// jQuery plugin intitilization

	$.fn.rangePicker = function(settings, callback){
		return this.each(function(){
            var $obj = $(this),
				$settings,
				rangePicker;

			if( $obj.data('_ranegPicker') ){
				rangePicker = $obj.data('_ranegPicker');

				if( settings.setDate )
					rangePicker.update( settings.setDate );

				return this;
			}
			else
				$settings = $.extend( true, {}, $.fn.rangePicker.defaults, settings || {} );

			// when calling rangePicker without any settings, only callback
			if( typeof settings == 'function' )
				callback = settings;

            rangePicker = new RangePicker($obj, $settings, callback);
            rangePicker.init();

            // save this instance on the element it's bound to
			$obj.data('_ranegPicker', rangePicker);
        });
	};

	////////////////////////////////////
	// Defaults

	$.fn.rangePicker.defaults = {
		RTL : false,
		closeOnSelect : true,
		presets : [{
				buttonText  : '1 month',
				displayText : 'one month',
				value       : '1m'
			},{
				buttonText  : '3 months',
				displayText : 'three months',
				value       : '3m'
			},{
				buttonText  : '6 months',
				displayText : 'six months',
				value       : '6m'
			},{
				buttonText  : '12 months',
				displayText : 'twelve months',
				value       : '12m',
			},{
				buttonText  : 'Custom',
				displayText : 'twelve months',
				value       : 'custom'
		}],
		months 	: ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'],
		minDate : [5,2006],
		maxDate : [8,2013],
		setDate : null
	};

})(window.jQuery);