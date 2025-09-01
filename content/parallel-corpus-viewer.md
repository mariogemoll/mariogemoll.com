<form id="nav" method="get">
    <h1>Parallel Corpus Viewer</h1>
    <div id="corpus-selection-container">
        Corpus
        <br>
        <select id="corpus-selection" name="corpus">
            <option value="">Select a corpus...</option>
        </select>
        <br>
        <span id="corpus-info"></span>
    </div>
    <div id="line-range-selection-container">
        Lines
        <br>
        <input type="number" id="from-line" name="from" min="1" value="1">
        to
        <input type="number" id="to-line" name="to" min="1" value="10">
    </div>
    <div>
        <button type="submit" id="fetchLines">Update</button>
    </div>
</form>
<table class="parallel-table">
    <thead>
        <tr>
            <th class="line-num">Line</th>
            <th class="de-text">German</th>
            <th class="en-text">English</th>
        </tr>
    </thead>
    <tbody id="parallelTableBody">
    </tbody>
</table>

<div id="disclaimer-bar">
    <p id="disclaimer-text"></p>
</div>
