module.exports = function(grunt) {
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    jshint: {
      options: {
        browser: true,
        shadow: true,
        '-W024': true
      },
      all: ['*.js',
            'lib/*.js',
            'static-assets/*.js',
            'src/**/*.js']
    },
    browserify: {
      main: {
        src: 'src/main.js',
        dest: 'live/main.js',
        options: {
          transform: ['brfs']
          //debug: true
        }
      },
      worker: {
        src: 'src/worker.js',
        dest: 'live/worker.js',
        options: {
          //debug: true
        }
      }
    },
    copy: {
      main: {
        files: [
          {
            expand: true,
            flatten: true,
            src: ['static-assets/*'],
            dest: 'live/',
            filter: 'isFile'
          }
        ]
      }
    },
    watch: {
      scripts: {
        files: ['src/**/*.js'],
        tasks: ['jshint',
                'browserify',
                'copy'],
        options: {
          nospawn: true
        }
      }
    }
  });

  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-browserify');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-contrib-copy');


  grunt.registerTask('default', ['jshint',
                                 'browserify',
                                 'copy']);

};
