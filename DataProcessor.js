/**
 * Quickmap implementation. Faster than native map. No checking. Needs consecutive array.
 */
if(!Array.prototype.qMap) {
    Array.prototype.qMap = function(fun, scope) {
      scope = scope || this;
      var len = this.length;
      var out = new Array(len);
      var i = 0;
      while (i < len) {
        out[i] = fun.apply(scope, [this[i], i, this]);
        i++;
      }
      return out;
    };
}

var DataProcessor = {};
DataProcessor.process_data = function(args) {
    var data = {
        resultset: [],
        extents: [],
        row_header_header: [],
        col_headers: [],
        row_headers: [],
        header_height: 0,
        header_header_width: 0
    };
    if (!args.data || (!args.data.cellset && args.data.cellset.length === 0)) {
        return;
    }
    /**
     * Figure out the header height. Break when reaching row headers.
     * This height is used for slice operations on cellset data,
     * to extract wanted portions of the table.
     */
    while(args.data.cellset[data.header_height][0].type !== 'ROW_HEADER') {
        data.header_height++;
    }
    /**
     * Figure out the split between row header headers and col headers.
     * Aka. Row header headers width.
     * Used in slice operations.
     */
    while(args.data.cellset[data.header_height-1][data.header_header_width].type === 'ROW_HEADER_HEADER') {
        data.header_header_width++;
    }

    /**
     * Row header headers can only be one row. Fetching that row only, slice it and pluck it's values.
     */
    data.row_header_header = _.pluck(args.data.cellset[data.header_height-1].slice(0, data.header_header_width), 'value');

    /**
     * Making a col headers array
     * [
     *   [col 1:1, col 1:2],
     *   [col 2:1, col 2:2]
     * ]
     */
    data.col_headers = args.data.cellset.slice(0, data.header_height).qMap( function(row){
        return _.pluck(row.slice(data.header_header_width), 'value');
    });
    //Transposing col headers, so one could easily join them to create labels
    //Also convenient as they are now indexed 1:1 to data cell column position.
    data.col_headers = d3.transpose(data.col_headers);

    /**
     * Making row headers array.
     * [
     *   [col 1:1, col 2:1],
     *   [col 1:2, col 2:2]
     * ]
     */
    var prevLabelRow = {};
    data.row_headers = args.data.cellset.slice(data.header_height).qMap( function(row, i, row_headers) {
        //Row labels in hierarchy does not repeat, so we need to "fill down" missing values.
        return row.slice(0, data.header_header_width).qMap(function(cell, j) {
            if(cell.value !== 'null') {
                //Save row position of non null cell values.
                //They might be the last one, and needed for "fill down".
                prevLabelRow[j] = i;
                return cell.value;
            }
            //Fetch cell value from last available non null value for this column.
            return row_headers[prevLabelRow[j]][j].value;
        });
    });
    
    /**
     * [
     *   [row1...],
     *   [row2...]
     * ]
     */
    data.resultset = args.data.cellset.slice(data.header_height).qMap( function(row) {
        //skip row header cells, and return an array with data cell values.
        return row.slice(data.header_header_width).qMap( function(cell) {
            if(cell.properties.raw !== "null") {
                return parseFloat(cell.properties.raw);
            } else {
                return null;
            }
        });
    });

    return data;
};