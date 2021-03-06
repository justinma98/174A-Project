window.Scene = window.classes.Scene =
class Scene extends Scene_Component
  { constructor( context, control_box )
      { super(   context, control_box );
        //if( !context.globals.has_controls   ) 
        //  context.register_scene_component( new Movement_Controls( context, control_box.parentElement.insertCell() ) ); 

        context.globals.graphics_state.camera_transform = Mat4.look_at( Vec.of( 0,0, 5 ), Vec.of( 0,0,0 ), Vec.of( 0,1,0 ) );

        const r = context.width/context.height;
        context.globals.graphics_state.projection_transform = Mat4.perspective( Math.PI/4, r, .1, 1000 );

        const shapes = { box:   new Cube(),
                         ball:  new Subdivision_Sphere(5),
                         torus:  new Torus( 3, 3 ),
                       }
        this.submit_shapes( context, shapes );
        
        this.webgl_manager = context;      // Save off the Webgl_Manager object that created the scene.
        this.scratchpad = document.createElement('canvas');
        this.scratchpad_context = this.scratchpad.getContext('2d');     // A hidden canvas for re-sizing the real canvas to be square.
        this.scratchpad.width   = 256;
        this.scratchpad.height  = 256;
        this.texture = new Texture ( context.gl, "", false, false );        // Initial image source: Blank gif file
        this.texture.image.src = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

        this.materials =
          { phong: context.get_instance( Fake_Bump_Map ).material( Color.of( 0,0,0,1 ), {ambient:1, texture: context.get_instance( "assets/square.png", false )}, { specular:1.0 } ),
            skybox: context.get_instance( Texture_Rotate ).material( Color.of( 0,0,0,1 ), {ambient:1, texture: context.get_instance( "assets/skybox.jpg", true )}),
            ball_redGlow_phong: context.get_instance( Fake_Bump_Map ).material( Color.of( 0,0,0,1 ), {ambient:1.0, texture: context.get_instance( "assets/ball.png", false )} ),
            piston: context.get_instance( Fake_Bump_Map ).material( Color.of( 0,0,0,1 ), {ambient:1, texture: context.get_instance( "assets/piston.png", true )} ),
            goal: context.get_instance ( Fake_Bump_Map ).material( Color.of( 0,0,0,.8 ), {ambient:1, texture: context.get_instance( "assets/goal.png", true )} ),
            bad_block: context.get_instance ( Fake_Bump_Map ).material( Color.of( 0,0,0,.8 ), {ambient:1, texture: context.get_instance( "assets/bad_block.png", false )} ),
            red_flash: context.get_instance ( Fake_Bump_Map ).material( Color.of( 1,0,0,.9 ), {ambient:1} ),
            green_flash: context.get_instance ( Fake_Bump_Map ).material( Color.of( 0,1,0,.9 ), {ambient:1} ),
            back_box: context.get_instance ( Fake_Bump_Map ).material( Color.of(.7, .7, .7, .7 ), {ambient:1} ),
            shadow: context.get_instance(Phong_Shader).material( Color.of( 0, 0, 0,1 ), { ambient: 1, texture: this.texture }, {specular: 1.0} ),
          }

        this.lights = [ new Light( Vec.of( -2,2,0,1 ), Color.of( 0,0,1,1 ), 0 ) ];
        
        // Camera
        this.zoom_out_base_constant = 20;

        // Ball (moving)
        this.x = 0; // current x pos
        this.y = -4; // current y pos
        this.z = -4 // locked z pos
        this.px = 0; // previous frame x pos
        this.py = 0; // previous frame y pos
        this.x_last = 0; // new origin x for calculating physics
        this.y_last = 0; // new origin y for calculating physics
        this.vi = Vec.of(0,8,0); // initial velocity
        this.time_last = 0; // resetting time to 0 after adding force
        this.velocity = Vec.of(0,8,0); // current velocity
        
        this.ball_radius = 1;
        this.min_vel_possible_before_zero = 0.0001;
        this.min_vel_for_bounce = 0.05;
        this.bounce_damping_constant = 0.4;

        // Map Objects (static)
        this.map_objs = [
            //0                         (position)           (scale)
            new Map_GameObject(Vec.of( 15, -4, -4 ), Vec.of( 20, 1, 2 )), //bottom
            new Map_GameObject(Vec.of( -4, 4, -4 ), Vec.of( 1, 8, 2 )), //left
            new Map_GameObject(Vec.of( 34, 4, -4 ), Vec.of( 1, 8, 2 )), //right
            new Map_GameObject(Vec.of( 15, 12, -4 ), Vec.of( 20, 1, 2 )), //top
            new Map_GameObject(Vec.of( 8, -2, -4 ), Vec.of( 2, 2, 2 )), //pillar 1
            new Map_GameObject(Vec.of( 12, 0, -4 ), Vec.of( 2, 5, 2 )), //pillar 2
            new Map_GameObject(Vec.of( 18, 6, -4 ), Vec.of( 1, 6, 2 )), //pillar 3
            
            //1                         (position)           (scale)
            new Map_GameObject(Vec.of( -22, -34, -4 ), Vec.of( 4, 1, 2 )), //bottom
            new Map_GameObject(Vec.of( -11, -34, -4 ), Vec.of( 2, 1, 2 )), //bottom
            new Map_GameObject(Vec.of( 0, -34, -4 ), Vec.of( 4, 1, 2 )), //bottom
            new Map_GameObject(Vec.of( -26, -27, -4 ), Vec.of( 1, 8, 2 )), //left
            new Map_GameObject(Vec.of( 4, -27, -4 ), Vec.of( 1, 8, 2 )), //right
            new Map_GameObject(Vec.of( -11, -20, -4 ), Vec.of( 16, 1, 2 )), //top
            new Map_GameObject(Vec.of( -15.5, -32, -8 ), Vec.of( 3, 6, 2 )), //depth pillars
            new Map_GameObject(Vec.of( -6.5 , -32, -8 ), Vec.of( 3, 6, 2 )), 
            new Map_GameObject(Vec.of( -15.5 , -32, -2 ), Vec.of( .5, 6, .5 )), 
            new Map_GameObject(Vec.of( -6.5 , -32, -2 ), Vec.of( .5, 6, .5 )), 
            new Map_GameObject(Vec.of( -15.5 , -28, -2 ), Vec.of( .5, .5, 2 )), 
            new Map_GameObject(Vec.of( -6.5 , -28, -2 ), Vec.of( .5, .5, 2 )),

            //2                         (position)           (scale)
            new Map_GameObject(Vec.of( 36, -34, -4 ), Vec.of( 6, 1, 2 )), //bottom
            new Map_GameObject(Vec.of( 57, -34, -4 ), Vec.of( 4, 1, 2 )), //bottom
            new Map_GameObject(Vec.of( 31, -27, -4 ), Vec.of( 1, 8, 2 )), //left
            new Map_GameObject(Vec.of( 62, -27, -4 ), Vec.of( 1, 8, 2 )), //right
            new Map_GameObject(Vec.of( 46, -20, -4 ), Vec.of( 16, 1, 2 )), //top
            new Map_GameObject(Vec.of( 42, -31, -4 ), Vec.of( 1, 4, 2 )), //pillar 1
            new Map_GameObject(Vec.of( 54, -31, -4 ), Vec.of( 1, 4, 2 )), //pillar 2
            new Map_GameObject(Vec.of( 44, -28, -8 ), Vec.of( 2, 6, 1 )), //depth pillars
            new Map_GameObject(Vec.of( 54, -28, -8 ), Vec.of( 2, 6, 1 )),
            new Map_GameObject(Vec.of( 48, -28, -8 ), Vec.of( 6, .5, .5 )),
            new Map_GameObject(Vec.of( 48, -26, -8 ), Vec.of( 6, .5, .5 )),
            new Map_GameObject(Vec.of( 48, -24, -8 ), Vec.of( 6, .5, .5 )),
        ] 

        // Piston Objects (static)
        this.piston_objs = [
            //0                           (position)     (rotation)  (power)
            new Piston_GameObject(Vec.of( 4, -3, -4 ), 0,  15),
            new Piston_GameObject(Vec.of( 8, 0, -4 ), 0,  15),
            new Piston_GameObject(Vec.of( 22, -3, -4 ), -Math.PI  / 8,  15),
            new Piston_GameObject(Vec.of( 30, 1, -4 ), Math.PI  / 8,  15),
            new Piston_GameObject(Vec.of( 26, 5, -4 ), -Math.PI  / 8,  15),

            //1                           (position)     (rotation)  (power)
            new Piston_GameObject(Vec.of( -20, -33, -4 ), -Math.PI  / 8,  8),
            new Piston_GameObject(Vec.of( -11, -33, -4 ), -Math.PI  / 8,  8),

            //2                           (position)     (rotation)  (power)
            new Piston_GameObject(Vec.of( 36, -33, -4 ), -Math.PI  / 8,  15),
            new Piston_GameObject(Vec.of( 38, -29, -4 ), -Math.PI  / 8,  15),
            new Piston_GameObject(Vec.of( 48, -28, -4 ), -Math.PI  / 8,  15),
        ]

        // Goal Object (static)               (position)
        this.goal_objs = [
            new Goal_GameObject(Vec.of(30, 8, -4), 0),
            new Goal_GameObject(Vec.of(0, -31, -4), 1),
            new Goal_GameObject(Vec.of(58, -31, -4), 2),
        ]

        // Bad Blocks (static)
        this.bad_blocks = [
            //1                         (position)           (scale)                               
            new Bad_Block_GameObject(Vec.of( -15.5, -36, -4 ), Vec.of( 3, 1, 2 )),
            new Bad_Block_GameObject(Vec.of( -6.5 , -36, -4 ), Vec.of( 3, 1, 2 )),

            //2                         (position)           (scale)         
            new Bad_Block_GameObject(Vec.of( 48 , -31, -4 ), Vec.of( 6, 1, 2 ))
        ]

        this.piston_pos = 0; // current piston position
        this.piston_t = 0;   // piston time used for animation
        this.piston_vec = []; //vector for each piston
        this.current_pistons = []; //current collided pistons

        // Piston
        for (var i = 0; i < this.piston_objs.length; i++) {
            this.piston_vec[i] = Vec.of(0,0,0);
            this.current_pistons[i] = 0;
        }
  
        //visual color changes for skybox to show special blocks hit
        this.red_flash = 0;
        this.green_flash = 0;
        this.red_flash_time = 0;
        this.green_flash_time = 0;
        this.flash_duration = .15;

        //which level are we on
        this.level = 0;
      }
    //////////////////////////////////////////////////////////
    // Piston Functions
    piston_push(){
        this.piston_t = 10;
        for(var i = 0; i < this.piston_objs.length; i++) {
            if (this.current_pistons[i] == 1) { //check which piston is currently touching ball
                this.add_force(this.piston_vec[i]); //apply force of that piston
            }
        }
        //console.log("tried pushing "+this.piston_vec[0]);
    }
    piston_function( x ){
        if (x > 6){
            this.piston_pos = 5 - 0.5 * x;
        } else {
            this.piston_pos = x/3;
        }
    }
    //////////////////////////////////////////////////////////
    // Physics Functions
    add_force( force ){
        this.vi[0] = force[0] + this.velocity[0];
        this.vi[1] = force[1] + this.velocity[1];
        this.x_last = this.x;
        this.y_last = this.y;
        this.time_last = this.time;
    }
    flip() {
        this.add_force( Vec.of(-10,1,0) );
      }
    flip2() {
        this.add_force( Vec.of(10,1,0) );
      }
    run_newtonian_physics(t)
    {
        this.time = t;
        this.px = this.x;
        this.py = this.y

        this.x = (t - this.time_last) * this.vi[0] + this.x_last;
        this.y = Math.pow(t - this.time_last,2) * -9.8 + (t - this.time_last) * this.vi[1] + this.y_last;
        
        this.velocity = Vec.of(50*(this.x - this.px), 50*(this.y - this.py), 0);

        if (this.velocity < this.min_vel_possible_before_zero)
            this.velocity = 0;
    }
    check_collision(map_obj, ball_max_x, ball_min_x, ball_max_y, ball_min_y, ball_vel_x, ball_vel_y, ball_vel_mag, ball_max_z, ball_min_z)
      { /*
        if (this.y < -2){
            this.velocity[0] *= 0.8;
            this.velocity[1] *= -0.8;
            this.y = -2;
            this.add_force( Vec.of(0,0,0) );
        }*/

        var dont_flip_x_dir_sign = 1; // 1 means don't flip
        var dont_flip_y_dir_sign = 1; // 1 means don't flip
        
        // Bools describing whether each edge of the ball overlaps with this map_obj
        var bottom_overlap = (ball_min_y < map_obj.max_y && ball_min_y > map_obj.min_y);
        var top_overlap = (ball_max_y < map_obj.max_y && ball_max_y > map_obj.min_y);
        var left_overlap = (ball_min_x < map_obj.max_x && ball_min_x > map_obj.min_x);
        var right_overlap = (ball_max_x < map_obj.max_x && ball_max_x > map_obj.min_x);

        // Bool describing if an object exists in front or behind the ball currently
        var object_front_back = ( (bottom_overlap || top_overlap || right_overlap || left_overlap) && 
             !(ball_min_z < map_obj.max_z && ball_min_z > map_obj.min_z) && !(ball_max_z < map_obj.max_z && ball_max_z > map_obj.min_z));
        
        // BOUNCE REVERSE: Checking for FULL OVERLAP of ball inside map platform
        if (bottom_overlap && top_overlap && right_overlap && left_overlap && !object_front_back)
          {
            dont_flip_x_dir_sign = -1;
            dont_flip_y_dir_sign = -1;
            // Don't know where to reset position to
          }
        // BOUNCE to UP: Bottom of ball is overlapping
        if (bottom_overlap && !top_overlap && ball_vel_y < 0 && !object_front_back &&
            ((ball_max_x + 0.1 < map_obj.max_x && ball_max_x - 0.1 > map_obj.min_x) || (ball_min_x + 0.1 < map_obj.max_x && ball_min_x - 0.1 > map_obj.min_x))) // checking within x-range
          {
            dont_flip_x_dir_sign = 1;
            dont_flip_y_dir_sign = -1;
            this.y = ball_vel_y < 0 ? map_obj.max_y + this.ball_radius : map_obj.min_y - this.ball_radius;
            //console.log("overlap bot");
          }
        // BOUNCE to DOWN: Top of ball is overlapping
        else if (top_overlap && !bottom_overlap && ball_vel_y > 0 && !object_front_back &&
            ((ball_max_x < map_obj.max_x && ball_max_x > map_obj.min_x) || (ball_min_x < map_obj.max_x && ball_min_x > map_obj.min_x))) // checking within x-range
          {
            dont_flip_x_dir_sign = 1;
            dont_flip_y_dir_sign = -1;
            this.y = ball_vel_y < 0 ? map_obj.max_y + this.ball_radius : map_obj.min_y - this.ball_radius;
            //console.log("overlap top");
          }
        // BOUNCE to the RIGHT: Left of ball is overlapping
        else if (left_overlap && !right_overlap && !object_front_back &&
            ((ball_max_y < map_obj.max_y && ball_max_y > map_obj.min_y) || (ball_min_y < map_obj.max_y && ball_min_y > map_obj.min_y))) // checking within y-range
          {
            dont_flip_x_dir_sign = -1;
            dont_flip_y_dir_sign = 1;
            this.x = ball_vel_x < 0 ? map_obj.max_x + this.ball_radius : map_obj.min_x - this.ball_radius;
            //console.log("overlap left");
          }
        // BOUNCE to the LEFT: Right of ball is overlapping
        else if (right_overlap && !left_overlap && !object_front_back &&
            ((ball_max_y < map_obj.max_y && ball_max_y > map_obj.min_y) || (ball_min_y < map_obj.max_y && ball_min_y > map_obj.min_y))) // checking within y-range
          {
            dont_flip_x_dir_sign = -1;
            dont_flip_y_dir_sign = 1;
            this.x = ball_vel_x < 0 ? map_obj.max_x + this.ball_radius : map_obj.min_x - this.ball_radius;
            //console.log("overlap right");
          }
        else // could not collide
          return false;
        
        // Did collide, so modify velocity (position was already reset)
        if (ball_vel_mag > this.min_vel_for_bounce)
        {
            this.velocity[0] *= dont_flip_x_dir_sign * this.bounce_damping_constant;
            this.velocity[1] *= dont_flip_y_dir_sign * this.bounce_damping_constant;
            this.add_force( Vec.of(0,0,0) ); // Update current movement with our new velocity
        }
      }  
    check_piston_collision(piston_obj, ball_max_x, ball_min_x, ball_max_y, ball_min_y, index)
      { if (ball_min_y < piston_obj.center[1]+1 && ball_max_y > piston_obj.center[1]-1 && 
            ball_min_x < piston_obj.center[0]+1 && ball_max_x > piston_obj.center[0]-1){
            this.piston_vec[index] = piston_obj.direction;
            this.current_pistons[index] = 1; 
            //console.log(piston_obj);
        } else {
            this.piston_vec[index] = Vec.of(0,0,0);
            this.current_pistons[index] = 0;
        }
      }  
    check_goal_collision(goal_obj, ball_max_x, ball_min_x, ball_max_y, ball_min_y) 
    {
      // Bools describing whether each edge of the ball overlaps with this goal_obj
        var bottom_overlap = (ball_min_y < goal_obj.max_y && ball_min_y > goal_obj.min_y);
        var top_overlap = (ball_max_y < goal_obj.max_y && ball_max_y > goal_obj.min_y);
        var left_overlap = (ball_min_x < goal_obj.max_x && ball_min_x > goal_obj.min_x);
        var right_overlap = (ball_max_x < goal_obj.max_x && ball_max_x > goal_obj.min_x);

        // LEVEL DONE: Checking for ANY OVERLAP of ball inside map platform
        if ((bottom_overlap && !top_overlap && ((ball_max_x + 0.1 < goal_obj.max_x && ball_max_x - 0.1 > goal_obj.min_x) || (ball_min_x + 0.1 < goal_obj.max_x && ball_min_x - 0.1 > goal_obj.min_x)))
            || (top_overlap && !bottom_overlap && ((ball_max_x < goal_obj.max_x && ball_max_x > goal_obj.min_x) || (ball_min_x < goal_obj.max_x && ball_min_x > goal_obj.min_x)))
            || (left_overlap && !right_overlap && ((ball_max_y < goal_obj.max_y && ball_max_y > goal_obj.min_y) || (ball_min_y < goal_obj.max_y && ball_min_y > goal_obj.min_y)))
            || (right_overlap && !left_overlap && ((ball_max_y < goal_obj.max_y && ball_max_y > goal_obj.min_y) || (ball_min_y < goal_obj.max_y && ball_min_y > goal_obj.min_y))) )
          {
            if (this.level == 2) {
                this.level = 0;
            } else {
                this.level++;
            }
            this.reset_local();
            this.green_flash = 1;
            //console.log("hit goal");
          }
        else // could not collide
          return false;   
    }
    check_bad_block_collision(bad_blocks, ball_max_x, ball_min_x, ball_max_y, ball_min_y) 
    {
        // Bools describing whether each edge of the ball overlaps with this bad block
        var bottom_overlap = (ball_min_y < bad_blocks.max_y && ball_min_y > bad_blocks.min_y);
        var top_overlap = (ball_max_y < bad_blocks.max_y && ball_max_y > bad_blocks.min_y);
        var left_overlap = (ball_min_x < bad_blocks.max_x && ball_min_x > bad_blocks.min_x);
        var right_overlap = (ball_max_x < bad_blocks.max_x && ball_max_x > bad_blocks.min_x);

        // LEVEL DONE: Checking for ANY OVERLAP of ball inside map platform
        if ((bottom_overlap && !top_overlap && ((ball_max_x + 0.1 < bad_blocks.max_x && ball_max_x - 0.1 > bad_blocks.min_x) || (ball_min_x + 0.1 < bad_blocks.max_x && ball_min_x - 0.1 > bad_blocks.min_x)))
            || (top_overlap && !bottom_overlap && ((ball_max_x < bad_blocks.max_x && ball_max_x > bad_blocks.min_x) || (ball_min_x < bad_blocks.max_x && ball_min_x > bad_blocks.min_x)))
            || (left_overlap && !right_overlap && ((ball_max_y < bad_blocks.max_y && ball_max_y > bad_blocks.min_y) || (ball_min_y < bad_blocks.max_y && ball_min_y > bad_blocks.min_y)))
            || (right_overlap && !left_overlap && ((ball_max_y < bad_blocks.max_y && ball_max_y > bad_blocks.min_y) || (ball_min_y < bad_blocks.max_y && ball_min_y > bad_blocks.min_y))) )
          {
            this.reset_local();
            this.red_flash = 1;
            //console.log("hit bad block");
          }
        else // could not collide
          return false;   
    }
    check_all_collisions()
      {
        var ball_vel_x = this.velocity[0];
        var ball_vel_y = this.velocity[1];
        var ball_vel_mag = Math.sqrt(ball_vel_x * ball_vel_x + ball_vel_y * ball_vel_y);
        if (ball_vel_mag == 0)
            return;

        var ball_max_x = this.x + this.ball_radius;
        var ball_min_x = this.x - this.ball_radius;
        var ball_max_y = this.y + this.ball_radius;
        var ball_min_y = this.y - this.ball_radius;
        var ball_max_z = this.z + this.ball_radius;
        var ball_min_z = this.z - this.ball_radius;
        
        var collided = false;
        
        var i;
        for (i = 0; i < this.map_objs.length; i++)
         {
            this.check_collision(this.map_objs[i], ball_max_x, ball_min_x, ball_max_y, ball_min_y, ball_vel_x, ball_vel_y, ball_vel_mag, ball_max_z, ball_min_z);
            collided = (ball_vel_x != this.velocity[0] && ball_vel_y != this.velocity[1]);
            if (collided)
             break;
         }
        for (i = 0; i < this.piston_objs.length; i++)
        {
            this.check_piston_collision(this.piston_objs[i], ball_max_x, ball_min_x, ball_max_y, ball_min_y, i);
//             if (this.piston_vec[0] != 0 && this.piston_vec[1] != 0)
//                 break;
        }
        
        for (i = 0; i < this.goal_objs.length; i++) 
        {
            this.check_goal_collision(this.goal_objs[i], ball_max_x, ball_min_x, ball_max_y, ball_min_y);
        }
        
        for (i = 0; i < this.bad_blocks.length; i++) 
        {
            this.check_bad_block_collision(this.bad_blocks[i], ball_max_x, ball_min_x, ball_max_y, ball_min_y);
        }
      }
    reset0() {
        this.x = 0; 
        this.y = -4; 
        this.px = 0;
        this.py = 0;
        this.x_last = 0; 
        this.y_last = -4; 
        this.vi = Vec.of(0,8,0); 
        this.velocity = Vec.of(0,8,0); 
    }
    reset1() { 
        this.x = -24; 
        this.y = -31; 
        this.px = -24;
        this.py = -31;
        this.x_last = -24; 
        this.y_last = -31; 
        this.vi = Vec.of(0,8,0); 
        this.velocity = Vec.of(0,8,0); 
    }
    reset2() {
        this.x = 34; 
        this.y = -31; 
        this.px = 34;
        this.py = -31;
        this.x_last = 34; 
        this.y_last = -31; 
        this.vi = Vec.of(0,8,0); 
        this.velocity = Vec.of(0,8,0); 
    }
    reset_local() {
        if (this.level == 0) {
            this.reset0();
        } else if (this.level == 1) {
            this.reset1();
        } else if (this.level == 2) {
            this.reset2();
        }
    }
    //////////////////////////////////////////////////////////
    // Buttons
    make_control_panel()
      { this.key_triggered_button( "Move Left", [ "a" ], this.flip );
        this.key_triggered_button( "Move Right", [ "d" ], this.flip2 );
        this.key_triggered_button( "Pistons", [ "w" ], this.piston_push );
        this.key_triggered_button( "Reset", ["r"], this.reset0 );
        this.key_triggered_button( "Reset Local", ["l"], this.reset_local );

        this.result_img = this.control_panel.appendChild( Object.assign( document.createElement( "img" ), 
                { style:"width:200px; height:" + 200 * this.aspect_ratio + "px" } ) );
      }
    //////////////////////////////////////////////////////////
    // Draw Objects
    draw_objects(graphics_state, box_objs, piston_objs, goal_objs, bad_blocks, ball_transform, t)
      {
        var i;
        for (i = 0; i < box_objs.length; i++)
          this.shapes.box.draw( graphics_state, box_objs[i].model_transform, this.materials.phong );

        if (this.piston_t > 0){
            this.piston_t--;
            this.piston_function(this.piston_t);
        }

        for (i = 0; i < piston_objs.length; i++){
          let temp_transform = piston_objs[i].model_transform.times(Mat4.translation([ 0, this.piston_pos, 0 ]));
          this.shapes.box.draw( graphics_state, temp_transform, this.materials.piston );
        }
                
        this.shapes.ball.draw( graphics_state, ball_transform, this.materials.ball_redGlow_phong );

        //show flash for certain duration
        let flash_transform = Mat4.identity();
        flash_transform = flash_transform
                                .times( Mat4.scale ( [50, 50, 1] ) );
        if (this.red_flash) {  
            if (this.red_flash_time == 0) {
                this.red_flash_time = t;
            } else if (t > this.red_flash_time + this.flash_duration) {
                this.red_flash = 0;
                this.red_flash_time = 0;
            } else {
                this.shapes.box.draw( graphics_state, flash_transform, this.materials.red_flash );
            }  
        } 
        if (this.green_flash) {
            if (this.green_flash_time == 0) {
                this.green_flash_time = t;
            } else if (t > this.green_flash_time + this.flash_duration) {
                this.green_flash = 0;
                this.green_flash_time = 0;
            } else {
                this.shapes.box.draw( graphics_state, flash_transform, this.materials.green_flash );
            }   
        }

        let box_transform = Mat4.identity();
        box_transform = box_transform.times( Mat4.translation( [20, -20, 0 ] ) ).times( Mat4.scale( [ 256, 256, 256 ] ) );
        this.shapes.box.draw( graphics_state, box_transform, this.materials.skybox );

        for (i = 0; i < this.goal_objs.length; i++) 
            this.shapes.torus.draw( graphics_state, goal_objs[i].model_transform.times( Mat4.rotation(t * 2 , Vec.of( 0, 0, 1 ) ) ), this.materials.goal);
      
        for (i = 0; i < bad_blocks.length; i++)
          this.shapes.box.draw( graphics_state, bad_blocks[i].model_transform, this.materials.bad_block );

        let back_transform = Mat4.identity();
        back_transform = back_transform.times(Mat4.translation([8, 4, -7])).times( Mat4.scale( [ 11, 8, 1 ] ) );
        this.shapes.box.draw( graphics_state, back_transform, this.materials.back_box );
      }
    //////////////////////////////////////////////////////////
    // Update Camera
    update_camera(graphics_state, ball_transform)
      {
        graphics_state.camera_transform = Mat4.look_at( Vec.of( ball_transform[0][3], ball_transform[1][3], ball_transform[2][3] 
                                                                + this.zoom_out_base_constant + Math.abs(this.velocity[0])/2 ), 
                                                        Vec.of( ball_transform[0][3], ball_transform[1][3], ball_transform[2][3] ), 
                                                        Vec.of( 0,1,0 ) )
                                                        .map( (x,i) => Vec.from( graphics_state.camera_transform[i] ).mix( x, 0.05 ) );
      }
    //////////////////////////////////////////////////////////
    // Update Frame Loop
    display( graphics_state )
      { graphics_state.lights = this.lights;
        const t = graphics_state.animation_time / 1000, dt = graphics_state.animation_delta_time / 1000;

        //set new positions
        this.run_newtonian_physics(t);

        //check for collisions 
        this.check_all_collisions();

        // Put light inside ball 
        graphics_state.lights = [ new Light( Vec.of( this.x,this.y,this.z,1 ), Color.of( 1,1,0,1 ), 100000), this.lights[0] ];
         
        this.current_view = graphics_state.camera_transform;
        graphics_state.camera_transform = Mat4.identity();
        
        //draw objects
        let ball_transform = Mat4.identity().times(Mat4.translation([ this.x, this.y, this.z ]) )

        this.draw_objects(graphics_state, this.map_objs, this.piston_objs, this.goal_objs, this.bad_blocks, ball_transform, t);
        
        
        this.scratchpad_context.drawImage( this.webgl_manager.canvas, 0, 0, 256, 256 );
        this.texture.image.src = this.result_img.src = this.scratchpad.toDataURL("image/png");
                                        // Clear the canvas and start over, beginning scene 2:
        this.webgl_manager.gl.clear( this.webgl_manager.gl.COLOR_BUFFER_BIT | this.webgl_manager.gl.DEPTH_BUFFER_BIT);

        //SCENE 2 RENDER
        graphics_state.camera_transform = this.current_view;
        
        //draw objects
        ball_transform = Mat4.identity().times(Mat4.translation([ this.x, this.y, this.z ]) );
        
        this.draw_objects(graphics_state, this.map_objs, this.piston_objs, this.goal_objs, this.bad_blocks, ball_transform, t);

        //update camera
        this.update_camera(graphics_state, ball_transform);

      }
  }


class Texture_Rotate extends Phong_Shader
{ fragment_glsl_code()           // ********* FRAGMENT SHADER ********* 
    {
      return `
        uniform sampler2D texture;
        void main()
        { if( GOURAUD || COLOR_NORMALS )    // Do smooth "Phong" shading unless options like "Gouraud mode" are wanted instead.
          { gl_FragColor = VERTEX_COLOR;    // Otherwise, we already have final colors to smear (interpolate) across vertices.            
            return;
          }

          float rps = mod(animation_time * 3.14 / 20.0, 2.0 * 3.14);
    
          mat3 inverse_translation_matrix = mat3(1.0, 0.0, 0.0,  0.0, 1.0, 0.0,  -0.5, -0.5, 1.0);
          vec3 texture_coord0 = inverse_translation_matrix * vec3(f_tex_coord.x, f_tex_coord.y, 1.0);

          
          mat3 rotation_matrix = mat3(cos(rps), sin(rps), 0.0,  -sin(rps), cos(rps), 0.0,  0.0, 0.0, 1.0);
          vec3 texture_coord1 = rotation_matrix * texture_coord0;
            
          mat3 translation_matrix = mat3(1.0, 0.0, 0.0,  0.0, 1.0, 0.0,  0.5, 0.5, 1.0);
          vec3 texture_coord2 = translation_matrix * texture_coord1;

          vec2 f_tex_coord2 = vec2(texture_coord2.x/texture_coord2.z, texture_coord2.y/texture_coord2.z);

                                           // If we get this far, calculate Smooth "Phong" Shading as opposed to Gouraud Shading.
                                            // Phong shading is not to be confused with the Phong Reflection Model.
          vec4 tex_color = texture2D( texture, f_tex_coord2 );                         // Sample the texture image in the correct place.
                                                                                      // Compute an initial (ambient) color:
          if( USE_TEXTURE ) gl_FragColor = vec4( ( tex_color.xyz + shapeColor.xyz ) * ambient, shapeColor.w * tex_color.w ); 
          else gl_FragColor = vec4( shapeColor.xyz * ambient, shapeColor.w );
          gl_FragColor.xyz += phong_model_lights( N );                     // Compute the final color with contributions from lights.
        }`;
    }
}

class Fake_Bump_Map extends Phong_Shader                         // Same as Phong_Shader, except this adds one line of code.
{ fragment_glsl_code()           // ********* FRAGMENT SHADER ********* 
    { return `
        uniform sampler2D texture;
        void main()
        { if( GOURAUD || COLOR_NORMALS )    // Do smooth "Phong" shading unless options like "Gouraud mode" are wanted instead.
          { gl_FragColor = VERTEX_COLOR;    // Otherwise, we already have final colors to smear (interpolate) across vertices.            
            return;
          }                                 // If we get this far, calculate Smooth "Phong" Shading as opposed to Gouraud Shading.
                                            // Phong shading is not to be confused with the Phong Reflection Model.
          
          vec4 tex_color = texture2D( texture, f_tex_coord );                    // Use texturing as well.
          vec3 bumped_N  = normalize( N + tex_color.rgb - .5*vec3(1,1,1) );      // Slightly disturb normals based on sampling
                                                                                 // the same image that was used for texturing.
                                                                                 
                                                                                 // Compute an initial (ambient) color:
          if( USE_TEXTURE ) gl_FragColor = vec4( ( tex_color.xyz + shapeColor.xyz ) * ambient, shapeColor.w * tex_color.w ); 
          else gl_FragColor = vec4( shapeColor.xyz * ambient, shapeColor.w );
          gl_FragColor.xyz += phong_model_lights( bumped_N );                    // Compute the final color with contributions from lights.
        }`;
    }
}