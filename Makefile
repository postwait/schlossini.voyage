
JS=public/js/errors.js

all:	$(JS)

public/js/%.js:	lib/%.js
	browserify -r $(<:%.js=./%) -o $@

clean:
	rm -f $(JS)
