// Runs inside QCAD (headless, via -autostart). The MCP server prepends
// `var SPEC = {...};` to this file before execution. See src/script.ts.
//
// SPEC = { unit, dimPrecision?, baseFile?, layers: [...], entities: [...], outputs: [{path, format}] }
// Points are [x, y]; polyline/hatch vertices may be [x, y, bulge]; angles are degrees.
// Results are reported as a single stdout line prefixed with QCAD_MCP_RESULT:.

include("scripts/library.js");
include("scripts/simple.js");

var RESULT_MARK = "QCAD_MCP_RESULT:";

function report(obj) {
    print(RESULT_MARK + JSON.stringify(obj));
}

function vec(p) {
    return new RVector(p[0], p[1]);
}

function rad(deg) {
    return RMath.deg2rad(deg);
}

var UNITS = {
    none: RS.None, mm: RS.Millimeter, cm: RS.Centimeter, m: RS.Meter, inch: RS.Inch
};

var FORMATS = { dxf: "DXF 2013", dwg: "DWG 2013" };

var H_ALIGN = { left: RS.HAlignLeft, center: RS.HAlignCenter, right: RS.HAlignRight };
var V_ALIGN = { base: RS.VAlignBase, bottom: RS.VAlignBottom, middle: RS.VAlignMiddle, top: RS.VAlignTop };

// Lineweights QCAD/DXF accept, in 1/100 mm.
var LINEWEIGHTS = [0, 5, 9, 13, 15, 18, 20, 25, 30, 35, 40, 50, 53, 60, 70, 80, 90, 100, 106, 120, 140, 158, 200, 211];

function lineweight(mm) {
    var target = Math.round(mm * 100);
    var best = LINEWEIGHTS[0];
    for (var i = 1; i < LINEWEIGHTS.length; i++) {
        if (Math.abs(LINEWEIGHTS[i] - target) < Math.abs(best - target)) {
            best = LINEWEIGHTS[i];
        }
    }
    return best;
}

function linetypeId(doc, name) {
    var id = doc.getLinetypeId(name);
    if (id === RObject.INVALID_ID) {
        throw new Error("Unknown linetype '" + name + "'. Available: " + doc.getLinetypeNames().join(", "));
    }
    return id;
}

function layerId(doc, name) {
    var id = doc.getLayerId(name);
    if (id === RObject.INVALID_ID) {
        throw new Error("Unknown layer '" + name + "'. Create it with add_layer first.");
    }
    return id;
}

function polylineShape(vertices, closed) {
    var pl = new RPolyline();
    for (var i = 0; i < vertices.length; i++) {
        var p = vertices[i];
        pl.appendVertex(vec(p), p.length > 2 ? p[2] : 0);
    }
    pl.setClosed(closed);
    return pl;
}

function rectangleVertices(e) {
    var x = e.corner[0], y = e.corner[1];
    return [[x, y], [x + e.width, y], [x + e.width, y + e.height], [x, y + e.height]];
}

// Applies the optional text override of a dimension ("<>" = measured value).
function withDimText(data, e) {
    if (e.text !== undefined) {
        data.setText(e.text);
    }
    return data;
}

function createEntity(doc, e) {
    var d;
    switch (e.type) {
    case "line":
        return new RLineEntity(doc, new RLineData(vec(e.start), vec(e.end)));
    case "circle":
        return new RCircleEntity(doc, new RCircleData(vec(e.center), e.radius));
    case "arc":
        return new RArcEntity(doc, new RArcData(vec(e.center), e.radius, rad(e.startAngle), rad(e.endAngle), false));
    case "polyline":
        return new RPolylineEntity(doc, new RPolylineData(polylineShape(e.points, !!e.closed)));
    case "rectangle":
        return new RPolylineEntity(doc, new RPolylineData(polylineShape(rectangleVertices(e), true)));
    case "ellipse":
        return new REllipseEntity(doc, new REllipseData(vec(e.center), vec(e.majorAxis), e.ratio,
            rad(e.startAngle === undefined ? 0 : e.startAngle),
            rad(e.endAngle === undefined ? 360 : e.endAngle), false));
    case "point":
        return new RPointEntity(doc, new RPointData(vec(e.position)));
    case "text":
        d = new RTextData();
        d.setText(e.text);
        d.setPosition(vec(e.position));
        d.setAlignmentPoint(vec(e.position));
        d.setTextHeight(e.height);
        d.setAngle(rad(e.angle || 0));
        d.setFontName(e.font || "Standard");
        d.setHAlign(H_ALIGN[e.hAlign || "left"]);
        d.setVAlign(V_ALIGN[e.vAlign || "base"]);
        return new RTextEntity(doc, d);
    case "dim_linear":
        d = new RDimRotatedData();
        // setRotation() re-projects the definition point, so it has to come first.
        d.setRotation(rad(e.direction === "vertical" ? 90 : e.direction === "horizontal" || e.direction === undefined ? 0 : e.direction));
        d.setExtensionPoint1(vec(e.p1));
        d.setExtensionPoint2(vec(e.p2));
        d.setDefinitionPoint(vec(e.dimLine));
        return new RDimRotatedEntity(doc, withDimText(d, e));
    case "dim_aligned":
        d = new RDimAlignedData();
        d.setExtensionPoint1(vec(e.p1));
        d.setExtensionPoint2(vec(e.p2));
        d.setDefinitionPoint(vec(e.dimLine));
        return new RDimAlignedEntity(doc, withDimText(d, e));
    case "dim_radius":
        d = new RDimRadialData();
        d.setDefinitionPoint(vec(e.center));
        d.setChordPoint(new RVector(e.center[0] + e.radius * Math.cos(rad(e.angle || 45)),
                                    e.center[1] + e.radius * Math.sin(rad(e.angle || 45))));
        return new RDimRadialEntity(doc, withDimText(d, e));
    case "dim_diameter":
        var a = rad(e.angle === undefined ? 45 : e.angle);
        d = new RDimDiametricData();
        d.setDefinitionPoint(new RVector(e.center[0] - e.radius * Math.cos(a), e.center[1] - e.radius * Math.sin(a)));
        d.setChordPoint(new RVector(e.center[0] + e.radius * Math.cos(a), e.center[1] + e.radius * Math.sin(a)));
        return new RDimDiametricEntity(doc, withDimText(d, e));
    case "dim_angular":
        d = new RDimAngular2LData();
        d.setExtensionLine1Start(vec(e.vertex));
        d.setExtensionLine1End(vec(e.p1));
        d.setExtensionLine2Start(vec(e.vertex));
        d.setDefinitionPoint(vec(e.p2));
        d.setDimArcPosition(vec(e.arcPoint));
        return new RDimAngular2LEntity(doc, withDimText(d, e));
    case "hatch":
        d = new RHatchData();
        d.setDocument(doc);
        d.setSolid(!!e.solid);
        d.setPatternName(e.solid ? "SOLID" : (e.pattern || "ANSI31"));
        d.setScale(e.scale || 1);
        d.setAngle(rad(e.angle || 0));
        for (var i = 0; i < e.loops.length; i++) {
            var loop = e.loops[i];
            d.newLoop();
            if (loop.circle) {
                d.addBoundary(new RCircle(vec(loop.circle.center), loop.circle.radius));
            } else {
                d.addBoundary(polylineShape(loop.points, true));
            }
        }
        return new RHatchEntity(doc, d);
    default:
        throw new Error("Unsupported entity type '" + e.type + "'");
    }
}

function applyStyle(doc, entity, e) {
    entity.setLayerId(layerId(doc, e.layer || "0"));
    if (e.color) entity.setColor(new RColor(e.color));
    if (e.linetype) entity.setLinetypeId(linetypeId(doc, e.linetype));
    if (e.lineweight !== undefined) entity.setLineweight(lineweight(e.lineweight));
}

function build() {
    var doc = createOffScreenDocument();
    var di = new RDocumentInterface(doc);

    if (SPEC.baseFile) {
        var err = di.importFile(SPEC.baseFile);
        if (err !== RDocumentInterface.IoErrorNoError) {
            throw new Error("Could not open base file '" + SPEC.baseFile + "' (error code " + err + ")");
        }
    }
    if (SPEC.unit) {
        doc.setUnit(UNITS[SPEC.unit]);
    }

    // Layers and dim style must exist before entities reference them, hence two operations.
    var op = new RAddObjectsOperation();
    if (SPEC.dimPrecision !== undefined) {
        // Dimension labels read the RDimStyle object, not the DIMDEC header variable.
        var dimStyle = doc.queryDimStyle();
        dimStyle.setInt(RS.DIMDEC, SPEC.dimPrecision);
        dimStyle.setInt(RS.DIMZIN, 8); // suppress trailing zeros
        op.addObject(dimStyle, false);
    }
    for (var i = 0; i < SPEC.layers.length; i++) {
        var l = SPEC.layers[i];
        var layer = doc.hasLayer(l.name) ? doc.queryLayer(l.name) : new RLayer(doc, l.name);
        layer.setColor(new RColor(l.color || "white"));
        layer.setLinetypeId(linetypeId(doc, l.linetype || "CONTINUOUS"));
        layer.setLineweight(lineweight(l.lineweight === undefined ? 0.25 : l.lineweight));
        op.addObject(layer, false);
    }
    di.applyOperation(op);

    op = new RAddObjectsOperation();
    for (var j = 0; j < SPEC.entities.length; j++) {
        var e = SPEC.entities[j];
        try {
            var entity = createEntity(doc, e);
            applyStyle(doc, entity, e);
            op.addObject(entity, false);
        } catch (ex) {
            throw new Error("Entity " + (e.id || j) + " (" + e.type + "): " + ex.message);
        }
    }
    di.applyOperation(op);

    var outputs = [];
    for (var k = 0; k < SPEC.outputs.length; k++) {
        var out = SPEC.outputs[k];
        if (!di.exportFile(out.path, FORMATS[out.format])) {
            throw new Error("Export failed: " + out.path + " (" + out.format + ")");
        }
        outputs.push(out.path);
    }

    var box = doc.getBoundingBox();
    report({
        ok: true,
        entityCount: doc.queryAllEntities().length,
        boundingBox: box.isValid()
            ? [box.getMinimum().x, box.getMinimum().y, box.getMaximum().x, box.getMaximum().y]
            : null,
        outputs: outputs
    });
}

try {
    build();
} catch (ex) {
    report({ ok: false, error: String(ex.message || ex) });
}
