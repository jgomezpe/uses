var uses = null // Main manager object, set to an object when Uses constructor is called

/**
 * Main class for loading javascript files and dependencies (as a hierarchy of javascript files - import)
 */
class Uses{
    /**
     * 
     * @param {*} root id for the root script 
     * @param {*} dependency Initially loaded dependencies if available
     */
	constructor(root, dependency={}){
        uses = this
        this.root = root
		this.dependency = dependency
	}

    /**
     * Checks the initial non-comment position on a javascript code
     * @param {*} code Javascript code
     * @returns Initial non-comment position on a javascript code
     */
	start( code ){
		var i=0
		var flag = true
		var space = ' \t\n\r\f\v\u00A0\u2028\u2029'
		while(flag){
			while(i<code.length && space.indexOf(code.charAt(i))>=0) i++
			flag = (i+1<code.length && code.charAt(i)=='/')
			if(flag){
				i++
				switch(code.charAt(i)){
					case '/':
						i++
						while(i<code.length && code.charAt(i)!='\n' && code.charAt(i)!='\r') i++
					break;
					case '*':
						i++
						while(i+1<code.length && (code.charAt(i)!='*' || code.charAt(i+1)!='/')) i++
						if(i+1==code.length){
							flag = false
							i=0
						}else i+=2
					break;
					default:
						flag = false
						i=0
				}
			}
		}
		return i
	}

	/**
     * Gets the argument list of the uses call in the javascript code (must be the first)
     * @param {*} code Javascript code to analyze
     * @param {*} i Initial position of non-comment code
     * @returns Argument list (javascript source resources) of the uses call
     */
	list(code, i){
		var start = code.substring(0,Math.min(5,code.length))
		if(start=='uses('){
			var j=i+5
			while(j<code.length && code.charAt(j)!=')') j++
			if(j<code.length) return j+1
		}
		return i
	}

    /**
     * Returns the array of arguments passed to the function
     * @returns The array of arguments passed to the function
     */
	get(){ return arguments }

	/**
	 * Gets the list of required javascript resources
	 * @param {*} code Calling javascript code
	 * @param {*} i Start position of uses list argument
	 * @param {*} j End position of the uses list argument
	 * @returns List of required javascript resources
	 */
	requires(code, i, j){
		if(i+5>=j) return []
		var args = code.substring(i+4,j)
		return eval('uses.get' + args)
	}

	/**
	 * Loads the given script (if possible)
	 * @param id Script id
	 * @param code Script code
	 */
	script(id, code){
		var element = document.createElement( 'script' )
		element.type = 'text/javascript'
		element.id = id 
		element.appendChild(document.createTextNode(code))
		document.body.appendChild(element)
	}

    /**
     * Adds a dependency between two javascript files
     * @param {*} caller Javascript code calling another javascript file
     * @param {*} id Javascript code being called
     */
	add_dependency(caller, id){
		var x = this
		x.dependency[caller] = x.dependency[caller] || []
		var i=0
		while(i<x.dependency[caller].length && x.dependency[caller][i] != id) i++
		if(i==x.dependency[caller].length) x.dependency[caller].push(id)
	}

    /**
     * Removes a dependency between two javascript files when satisfied
     * @param {*} caller Javascript code calling another javascript file
     * @param {*} id Javascript code being called
     * @returns true if the caller javascript does not have anymore dependencies to satisfy, false otherwise
     */
	del_dependency(caller, id){
		var x = this
		var i=0
		while(i<x.dependency[caller].length && x.dependency[caller][i] != id) i++
		if(i<x.dependency[caller].length) x.dependency[caller].splice(i,1)
		return x.dependency[caller].length == 0
	}

	/**
	 * Loads a javascript
	 * @param id Javascript to load (if necessary)
	 * @param callback Function that will be called when the javascript is loaded and run
	 */
	load(id, callback){
		if(id===null) return
		var x = this
		if( x.dependency[id] === undefined ){
			x.dependency[id] = x.dependency[id] || []

			function init(code){
				var i=x.start(code)
				var j = x.list(code,i)
				var deps = x.requires(code,i,j)
				var n = deps.length
				if(n > 0){
					code = code.substring(j, code.length)
					x.set(id, deps, function(){
						x.script(id, code)
						callback(id)
					})
				}else{
					x.script(id, code)
                    x.dependency[id] = 'loaded'
					callback(id)
				}
			}
			fetch(id).then((response) => response.text()).then((code) => init(code)).catch(error => console.error('Error:', error))
		}else{
			function check(){
				if(typeof x.dependency[id]!=='string') setTimeout(check, 100)
				else callback(id)	
			}
			check()
		}
	}

    /**
     * Loads a set of javascripts files that are required by another javascript
     * @param {*} caller Javascript requesting the javascript
     * @param {*} ids Set of Javascript to load (if necessary)
     * @param {*} callback Function to call after loading all dependencies of the caller
     */
    set(caller, ids, callback){
        var x = this
		for( var i=0; i<ids.length; i++ ) x.add_dependency(caller,ids[i])
		for( var i=0; i<ids.length; i++ ) x.load(ids[i], function(id){
			if(x.del_dependency(caller,id)) callback(caller)
		})
    }
}