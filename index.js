/**
 * transform Anvil test cases to ti-mocha specs
 *
 * Author: Jeff Haynie <jhaynie@appcelerator.com>
 * License: Apache-2
 */
var path = require('path'),
	colors = require('colors'),
	wrench = require('wrench'),
	fs = require('fs-extra'),
	Uglify = require('uglify-js'),
	longjohn = require('longjohn');

var EXCLUDE_DIRS = ['.DS_Store','.git','.svn','CVS','RCS','SCCS'];

longjohn.async_trace_limit = -1;

/**
 * returns true if file path is a directory
 */
function isDirectory(file) {
	return fs.statSync(file).isDirectory();
}

/**
 * Recursively get a listing of files for a given directory
 */
function filelisting(recursive, dir, filter, files, dest) {
	files = files || [];
	var type = typeof(filter);
	fs.readdirSync(dir).forEach(function(f) {
		if (f === dest) {
			return;
		}
		f = path.join(path.resolve(dir), f);
		var base = path.basename(f);
		if (isDirectory(f)) {
			recursive && !~EXCLUDE_DIRS.indexOf(f) && filelisting(recursive, f, filter, files, dest);
		}
		else {
			if (filter) {
				if (type === 'function') {
					filter(f,dir) && files.push(f);
				}
				else if (type === 'object') {
					filter.test(f) && files.push(f);
				}
			}
			else {
				files.push(f);
			}
		}
	});
	return files;
}

function parse(source, filename) {
	// parse the JS file
	var ast = Uglify.parse(source, {
		filename: filename,
		comments: true
	});
	ast.figure_out_scope();


	var suiteName,
		testNames = {};

	// create the AST transformer
	var transformer = new Uglify.TreeTransformer(null, function(node, descend){
		// console.log(node.TYPE,node.print_to_string());
		if (node instanceof Uglify.AST_Toplevel) {
			return;
		}
		if (node instanceof Uglify.AST_Call) {
			if (node.start.value === 'valueOf') {
				node.expression.name = node.start.value = node.expression.thedef.name = 'should';
				if (node.args.length<2) {
					//NOTE: some tests have bugs in them like
					//suites/ui_textArea.js line 130 (missing testRun first argument)
					var newnode = new Uglify.AST_Call({
						expression: node.expression,
						args: [
							node.args[0]
						]
					});
				}
				else {
					var newnode = new Uglify.AST_Call({
						expression: node.expression,
						args: [
							node.args[1]
						]
					});
				}
				return newnode;
			}
			else if (node.start.value === 'should') {
				var benode = new Uglify.AST_Dot({
					property: 'be',
					expression: node.expression.expression
				});
				var property,
					call,
					name = node.expression.property,
					not = name.indexOf('Not') > 0;
				switch (name) {
					case 'shouldNotBeFalse':
					case 'shouldBeFalse': {
						property = 'false';
						break;
					}
					case 'shouldNotBeTrue':
					case 'shouldBeTrue': {
						property = 'true';
						break;
					}
					case 'shouldNotBeNull':
					case 'shouldBeNull': {
						property = 'null';
						break;
					}
					case 'shouldNotBeUndefined': 
					case 'shouldBeUndefined': {
						node.args = [
							new Uglify.AST_String({value:'undefined'})
						];
						property = 'type';
						break;
					}
					case 'shouldNotBeString':
					case 'shouldBeString': {
						property = 'String';
						break;
					}
					case 'shouldBeGreaterThan': {
						property = 'greaterThan';
						break;
					}
					case 'shouldBeLessThan': {
						property = 'lessThan';
						break;
					}
					case 'shouldNotBeObject':
					case 'shouldBeObject': {
						property = 'Object';
						break;
					}
					case 'shouldNotBeFunction':
					case 'shouldBeFunction': {
						property = 'Function';
						break;
					}
					case 'shouldNotBeNumber':
					case 'shouldBeNumber': {
						property = 'Number';
						break;
					}
					case 'shouldNotBeBoolean':
					case 'shouldBeBoolean': {
						property = 'Boolean';
						break;
					}
					case 'shouldNotBe':
					case 'shouldBe': {
						property = 'eql';
						break;
					}
					case 'shouldNotBeExactly':
					case 'shouldBeExactly': {
						property = 'equal';
						break;
					}
					case 'shouldNotBeArray': 
					case 'shouldBeArray': {
						property = 'Array';
						break;
					}
					case 'shouldNotThrowException': 
					case 'shouldThrowException': {
						property = 'throw';
						call = true;
						break;
					}
					case 'shouldBeGreaterThanEqual': {
						property = 'within';
						call = true;
						node.args.push(new Uglify.AST_Infinity());
						break;
					}
					case 'shouldBeLessThanEqual': {
						property = 'within';
						call = true;
						node.args.push(new Uglify.AST_Atom({value:-Infinity}));
						break;
					}
					case 'shouldBeOneOf':
					case 'shouldContain': {
						property = 'containEql';
						call = true;
						break;
					}
					case 'shouldMatchArray': {
						property = 'equal';
						call = true;
						break;
					}
					case 'shouldBeZero': {
						property = 'equal';
						node.args.push(new Uglify.AST_Number({value:'0'}));
						call = true;
						break;
					}
					default: {
						console.log('UNKNOWN SHOULD=>',name,node.print_to_string(),node.start);
						process.exit(1);
					}
				}
				if (not) {
					var notnode = new Uglify.AST_Dot({
						property: 'not',
						expression: benode.expression
					});
					benode.expression = notnode;
				}
				if (node.args.length || call) {
					var dotnode = new Uglify.AST_Dot({
						property: property,
						expression: benode
					});
					return new Uglify.AST_Call({
						expression: dotnode,
						args: node.args
					});
				}
				else {
					return new Uglify.AST_Dot({
						property: property,
						expression: benode
					});
				}
			}
			else if (node.start.value === 'finish') {
				// finish should no longer take any arguments
				node.args = [];
				return;
			}
			else if (node.start.value==='new') {
				return;
			}
			return;
		}
		else if (node instanceof Uglify.AST_If) {
			if (node.body && node.body.body && node.body.body[0] && 
				node.body.body[0].body && node.body.body[0].body.body && 
				node.body.body[0].body.body.length==0) {
				// remove our empty conditionals
				return new Uglify.AST_EmptyStatement();
			}
		}
		else if (node instanceof Uglify.AST_Assign) {
			if (node.start.value==='this' && node.operator === '=') {
				switch (node.left.property){
					case 'init': {
						return new Uglify.AST_EmptyStatement();
					}
					case 'name': {
						suiteName = node.right.value;
						return new Uglify.AST_EmptyStatement();
					}
					case 'tests': {
						function addTests(elements, if_cond) {
							elements.forEach(function(element){
								var timeout = -1;
								if (element.properties.length>1) {
									timeout = element.properties[1].value.value;
								}
								testNames[element.properties[0].value.value]={timeout:timeout,cond:if_cond};
							});
						}
						if (!node.right.elements) {
							// if (Ti.Platform.osname === 'android') {
							// 	this.tests = this.tests.concat([
							// 		{name: "nullArrayTest"}
							// 	]);
							// }
							if (node.right instanceof Uglify.AST_Call) {
								// appending tests
								if (node.right.expression && node.right.expression.property==='concat') {
									// see if we have a conditional
									if_cond = transformer.find_parent(Uglify.AST_If);
									addTests(node.right.args[0].elements,if_cond && if_cond.condition);
									return new Uglify.AST_BlockStatement({
										body: []
									});
								}
							}
						}
						else {
							addTests(node.right.elements);
						}
						return new Uglify.AST_EmptyStatement();
					}
					default: {
						var name = node.left.property,
							found = testNames[name];
						if (found) {
							if (found.timeout > 0) {
								// add the timeout if specified
								var n = Uglify.parse("this.timeout("+found.timeout+")");
								node.right.body.unshift(n);
							}
							node.right.argnames[0].name = node.right.argnames[0].thedef.name = 'finish';
							var newnode = new Uglify.AST_Call({
								expression: new Uglify.AST_SymbolRef({name:"it"}),
								args: [
									new Uglify.AST_String({
										value: name
									}),
									node.right
								]
							});
							if (found.cond) {
								var expr = '('+found.cond.print_to_string()+'?it:it.skip)'+newnode.print_to_string().substring(2);
								return Uglify.parse(expr);
							}
							return newnode;
						}
						else {
							// this is OK, just not a test case accessor
							return;
						}
						break;
					}
				}
			}
			else if (node.start.value==='module' && node.operator === '=' && node.left.property === 'exports') {
				var newnode = new Uglify.AST_Call({
					expression: new Uglify.AST_SymbolRef({name:"describe"}),
					args: [
						new Uglify.AST_String({
							value: suiteName
						}),
						node.right.expression
					]
				});
				return newnode;
			}
		}
		else if (node instanceof Uglify.AST_Var) {
			var defs = [];
			for (var c=0;c<node.definitions.length;c++) {
				var def = node.definitions[c];
				// remove these definitions
				if (def.name && /(finish|valueOf)/.test(def.name.name)) {
					continue;
				}
				defs.push(def);
			}
			node.definitions = defs;
			if (defs.length === 0) {
				return new Uglify.AST_EmptyStatement();
			}
			return node;
		}
	});
	var result = ast.transform(transformer);
	var compressor = Uglify.Compressor({
			global_defs: {},
			warnings: false,
			unused: false, // don't turn on, this will cause too many sideaffects
			dead_code: true,
			join_vars: false,
			properties: true,
			sequences: false,
			conditionals: false,
			comparisons: true,
			evaluate: false,
			booleans: false,
			loops: true,
			hoist_funs: false,
			hoist_vars: false,
			if_return: true,
			join_vars: false,
			cascade: false,
			drop_debugger: true
		}),
		stream = Uglify.OutputStream({
			beautify: true,
			comments:true
		});

	result.figure_out_scope();
	result = result.transform(compressor);
	result.print(stream);


	return stream.toString();
}

if (process.argv.length<3) {
	console.log('Usage: '+path.basename(process.argv[1])+' <anvil_dir> <output_dir>');
	process.exit(1);
}

var fn = path.resolve(process.argv[2]);
if (isDirectory(fn)) {
	var out = process.argv[3];
	if (!out) {
		console.error("Missing output directory");
		process.exit(1);
	}
	if (!fs.existsSync(out)) {
		wrench.mkdirSyncRecursive(out);
	}
	filelisting(true,fn).forEach(function(jfn){
		var relativeFn = path.relative(fn,jfn),
			outFn = path.join(out,relativeFn),
			outDir = path.dirname(outFn);
		if (!fs.existsSync(outDir)) {
			wrench.mkdirSyncRecursive(outDir);
		}
		// if a JS file and looks like an Anvil testcase, attempt to compile it
		if (path.extname(jfn)==='.js' && String(fs.readFileSync(jfn)).indexOf('this.tests')>0) {
			console.log('Converting...',relativeFn.green);
			var code = parse(fs.readFileSync(jfn).toString(),jfn);
			fs.writeFileSync(outFn,code,'utf-8');
		}
		// otherwise, just copy it
		else {
			fs.copySync(jfn,outFn);
		}
	});
}
else {
	var code = parse(fs.readFileSync(fn).toString(),fn);
	console.log(code);
}

