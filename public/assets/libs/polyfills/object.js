const isEnumerable = Function.bind.call(Function.call, Object.prototype.propertyIsEnumerable);

if (!Object.values) {
	Object.values = function values(O) {
		var v = [];
		for (var k in O) {
			if (O.hasOwnProperty(k) && isEnumerable(O, k)) {
				v.push(O[k]);
			}
		}
		return v;
	};
}
