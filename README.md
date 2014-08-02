rangePicker
========

Will convert an input field into a dropdown motnh-picker what lets the user chose between presets and custom dates.
Highly configurable. This plugin currently uses Tether for positioning the picker. It's not a must, but it's better
to position the picker on screen this way, inseatd of absolutely positioning it inside some element, due to overflow clipping
that might occur.

Tested on IE9+ and obviously works on normal browsers.

## Demo page
http://yaireo.github.io/dateRangePicker/

## How to use:
    $('input').rangePicker({ minDate:[2,2009], maxDate:[10,2013] })
        // subscribe to the "done" event after user had selected a date
        .on('datePicker.done', function(e, result){
            console.log(result);
        });


## Settings

The main settings object is `$.fn.rangePicker.defaults` and these are the default settings, which can be set per-intance:

    {
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
                value       : '12m'
        }],
        months  : ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'],
        minDate : [5,2006],
        maxDate : [8,2013],
        setDate : null
    }