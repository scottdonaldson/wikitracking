var months = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December'
];

module.exports = {
    now: function() {
        return new Date();
    },
    monthName: function monthName(i) {
        return months[i];
    }
};
